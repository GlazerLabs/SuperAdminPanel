import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import https from "node:https";

const DRIVE_ID = process.env.ONEDRIVE_DRIVE_ID;
const DEFAULT_SUBFOLDERS = ["Inward", "Outward", "Invoices", "Others"];
const CHUNK_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4 MB
const CHUNK_SIZE = 5 * 320 * 1024; // 1.6 MB per chunk — safe for slow connections

let _cachedRootFolderId = null;

function normalizeSubfolderName(rawSubfolder) {
  const normalized = String(rawSubfolder || "").trim().toLowerCase();
  if (!normalized) return "Others";

  if (["inward", "inwards"].includes(normalized)) return "Inward";
  if (["outward", "outwards"].includes(normalized)) return "Outward";
  if (["invoice", "invoices"].includes(normalized)) return "Invoices";
  if (["other", "others"].includes(normalized)) return "Others";
  return "Others";
}

function getGraphClient() {
  if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
    throw new Error("Missing Azure app credentials for Microsoft Graph.");
  }
  if (!DRIVE_ID) {
    throw new Error("Missing ONEDRIVE_DRIVE_ID.");
  }

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });

  return Client.initWithMiddleware({ authProvider });
}

function sanitizeFolderName(name) {
  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|#%&{}~]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function normalizeComparableName(name) {
  return sanitizeFolderName(name).toLowerCase().replace(/\s+/g, " ").trim();
}

function getLeadFolderName(leadId, leadName) {
  const safeLeadName = sanitizeFolderName(leadName);
  return safeLeadName || `Lead-${leadId}`;
}

async function createFolderUnder(client, parentPath, folderName, conflictBehavior = "rename") {
  return client.api(parentPath).post({
    name: folderName,
    folder: {},
    "@microsoft.graph.conflictBehavior": conflictBehavior,
  });
}

async function ensureRootFolder(client) {
  if (_cachedRootFolderId) return _cachedRootFolderId;
  const rootItem = await client.api(`/drives/${DRIVE_ID}/root`).get();
  _cachedRootFolderId = rootItem.id;
  return rootItem.id;
}

async function getRootChildren(client) {
  const rootFolderId = await ensureRootFolder(client);
  const response = await client.api(`/drives/${DRIVE_ID}/items/${rootFolderId}/children`).get();
  return { rootFolderId, items: Array.isArray(response?.value) ? response.value : [] };
}

function findFolderInItems(items, leadId, targetName) {
  const byName = items.find(
    (item) => item?.folder && String(item.name || "").trim().toLowerCase() === targetName.toLowerCase()
  );
  if (byName) return byName;

  const legacyPrefix = `${leadId} - `;
  return items.find((item) => item?.folder && String(item.name || "").startsWith(legacyPrefix)) || null;
}

async function ensureSubfolders(client, parentFolderId) {
  await Promise.all(
    DEFAULT_SUBFOLDERS.map((name) =>
      createFolderUnder(
        client,
        `/drives/${DRIVE_ID}/items/${parentFolderId}/children`,
        name,
        "replace"
      ).catch(() => null)
    )
  );
}

export async function ensureLeadFolder(leadId, leadName, { skipSubfolders = false } = {}) {
  const client = getGraphClient();
  const targetName = getLeadFolderName(leadId, leadName);
  const { rootFolderId, items } = await getRootChildren(client);

  let folder = findFolderInItems(items, leadId, targetName);
  const isNewFolder = !folder;

  if (!folder) {
    folder = await createFolderUnder(
      client,
      `/drives/${DRIVE_ID}/items/${rootFolderId}/children`,
      targetName,
      "rename"
    );
  }

  if (isNewFolder || !skipSubfolders) {
    await ensureSubfolders(client, folder.id);
  }

  return folder;
}

export async function renameLeadFolder(leadId, leadName, previousLeadName = "") {
  const client = getGraphClient();
  const newName = getLeadFolderName(leadId, leadName);
  const oldName = getLeadFolderName(leadId, previousLeadName);

  const { items } = await getRootChildren(client);

  let folder = findFolderInItems(items, leadId, oldName);
  if (!folder) {
    folder = findFolderInItems(items, leadId, newName);
  }
  if (!folder) {
    throw new Error(
      `Existing folder not found for rename. Tried old name "${oldName}" and legacy mapping.`
    );
  }

  if (String(folder.name || "").trim() !== newName) {
    await client.api(`/drives/${DRIVE_ID}/items/${folder.id}`).patch({ name: newName });
  }

  await ensureSubfolders(client, folder.id);
  return { id: folder.id, name: newName };
}

async function uploadSmallFile(client, path, fileBuffer, mimeType) {
  return client
    .api(path)
    .header("Content-Type", mimeType || "application/octet-stream")
    .put(fileBuffer);
}

function uploadChunk(url, chunk, contentRange) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "PUT",
        headers: {
          "Content-Length": chunk.length,
          "Content-Range": contentRange,
        },
        timeout: 5 * 60 * 1000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          let json = null;
          try { json = JSON.parse(body); } catch (_e) { /* not json */ }
          resolve({ status: res.statusCode, body, json });
        });
      }
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("Chunk upload timed out")); });
    req.on("error", reject);
    req.write(chunk);
    req.end();
  });
}

async function uploadLargeFile(client, folderId, targetSubfolder, safeFileName, fileBuffer) {
  const sessionUrl = `/drives/${DRIVE_ID}/items/${folderId}:/${targetSubfolder}/${safeFileName}:/createUploadSession`;
  const session = await client.api(sessionUrl).post({
    item: {
      "@microsoft.graph.conflictBehavior": "replace",
      name: safeFileName,
    },
  });

  const uploadUrl = session.uploadUrl;
  if (!uploadUrl) throw new Error("Failed to create upload session.");

  const totalSize = fileBuffer.length;
  let offset = 0;
  let result = null;

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = fileBuffer.slice(offset, end);
    const contentRange = `bytes ${offset}-${end - 1}/${totalSize}`;

    const res = await uploadChunk(uploadUrl, chunk, contentRange);

    if (res.status !== 200 && res.status !== 201 && res.status !== 202) {
      throw new Error(`Chunk upload failed (${res.status}): ${res.body}`);
    }

    if (res.status === 200 || res.status === 201) {
      result = res.json || {};
    }

    offset = end;
  }

  return result;
}

function extractWebUrl(obj) {
  const w = obj?.webUrl;
  return typeof w === "string" && w.trim() ? w.trim() : null;
}

export async function uploadFileToLeadFolder(leadId, leadName, subfolder, fileName, fileBuffer, mimeType) {
  const client = getGraphClient();
  const folder = await ensureLeadFolder(leadId, leadName, { skipSubfolders: true });
  const targetSubfolder = normalizeSubfolderName(subfolder);
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;

  let uploaded;
  if (fileBuffer.length > CHUNK_UPLOAD_THRESHOLD) {
    uploaded = await uploadLargeFile(client, folder.id, targetSubfolder, safeFileName, fileBuffer);
  } else {
    const path = `/drives/${DRIVE_ID}/items/${folder.id}:/${targetSubfolder}/${safeFileName}:/content`;
    uploaded = await uploadSmallFile(client, path, fileBuffer, mimeType);
  }

  let itemId = uploaded?.id;
  let fileWebUrl = extractWebUrl(uploaded);

  if (!itemId) {
    try {
      const byPath = await client
        .api(`/drives/${DRIVE_ID}/items/${folder.id}:/${encodeURIComponent(targetSubfolder)}/${encodeURIComponent(safeFileName)}`)
        .get();
      itemId = byPath?.id;
      if (!fileWebUrl) fileWebUrl = extractWebUrl(byPath);
    } catch {
      // ignore
    }
  }

  if (itemId && !fileWebUrl) {
    try {
      const meta = await client.api(`/drives/${DRIVE_ID}/items/${itemId}`).select("webUrl").get();
      fileWebUrl = extractWebUrl(meta);
    } catch {
      // ignore
    }
    if (!fileWebUrl) {
      try {
        const linkResult = await client
          .api(`/drives/${DRIVE_ID}/items/${itemId}/createLink`)
          .post({ type: "view", scope: "organization" });
        fileWebUrl = extractWebUrl(linkResult?.link);
      } catch {
        // ignore
      }
    }
  }

  return {
    folderId: folder.id,
    subfolder: targetSubfolder,
    fileName: safeFileName,
    ...(fileWebUrl ? { fileWebUrl } : {}),
  };
}

export async function streamUploadToLeadFolder(leadId, leadName, subfolder, fileName, file, mimeType, onProgress) {
  const client = getGraphClient();
  onProgress?.({ stage: "preparing", percent: 0 });

  const folder = await ensureLeadFolder(leadId, leadName, { skipSubfolders: true });
  const targetSubfolder = normalizeSubfolderName(subfolder);
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;
  const totalSize = file.size;

  onProgress?.({ stage: "creating_session", percent: 2 });

  const sessionUrl = `/drives/${DRIVE_ID}/items/${folder.id}:/${targetSubfolder}/${safeFileName}:/createUploadSession`;
  const session = await client.api(sessionUrl).post({
    item: { "@microsoft.graph.conflictBehavior": "replace", name: safeFileName },
  });
  if (!session?.uploadUrl) throw new Error("Failed to create upload session.");
  const uploadUrl = session.uploadUrl;

  let offset = 0;
  let result = null;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  let chunkIndex = 0;

  onProgress?.({ stage: "uploading", percent: 5 });

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const blob = file.slice(offset, end);
    const chunk = Buffer.from(await blob.arrayBuffer());
    const contentRange = `bytes ${offset}-${end - 1}/${totalSize}`;

    const res = await uploadChunk(uploadUrl, chunk, contentRange);

    if (res.status !== 200 && res.status !== 201 && res.status !== 202) {
      throw new Error(`Chunk upload failed (${res.status}): ${res.body}`);
    }
    if (res.status === 200 || res.status === 201) {
      result = res.json || {};
    }

    chunkIndex++;
    const percent = Math.min(5 + Math.round((chunkIndex / totalChunks) * 90), 95);
    onProgress?.({ stage: "uploading", percent });

    offset = end;
  }

  onProgress?.({ stage: "finalizing", percent: 96 });

  let itemId = result?.id;
  let fileWebUrl = extractWebUrl(result);

  if (itemId && !fileWebUrl) {
    fileWebUrl = await resolveFileWebUrl(itemId);
  }

  onProgress?.({ stage: "done", percent: 100 });

  return {
    folderId: folder.id,
    subfolder: targetSubfolder,
    fileName: safeFileName,
    ...(fileWebUrl ? { fileWebUrl } : {}),
  };
}

export async function createDirectUploadSession(leadId, leadName, subfolder, fileName) {
  const client = getGraphClient();
  const folder = await ensureLeadFolder(leadId, leadName);
  const targetSubfolder = normalizeSubfolderName(subfolder);
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;

  const sessionUrl = `/drives/${DRIVE_ID}/items/${folder.id}:/${targetSubfolder}/${safeFileName}:/createUploadSession`;
  const session = await client.api(sessionUrl).post({
    item: {
      "@microsoft.graph.conflictBehavior": "replace",
      name: safeFileName,
    },
  });

  if (!session?.uploadUrl) throw new Error("Failed to create upload session.");

  return {
    uploadUrl: session.uploadUrl,
    folderId: folder.id,
    subfolder: targetSubfolder,
    fileName: safeFileName,
  };
}

export async function resolveFileWebUrl(itemId) {
  if (!itemId) return null;
  const client = getGraphClient();

  try {
    const meta = await client.api(`/drives/${DRIVE_ID}/items/${itemId}`).select("webUrl").get();
    const url = extractWebUrl(meta);
    if (url) return url;
  } catch (_e) { /* ignore */ }

  try {
    const linkResult = await client
      .api(`/drives/${DRIVE_ID}/items/${itemId}/createLink`)
      .post({ type: "view", scope: "organization" });
    return extractWebUrl(linkResult?.link);
  } catch (_e) { /* ignore */ }

  return null;
}

export async function getLeadFolderLink(leadId, leadName) {
  const client = getGraphClient();
  const folder = await ensureLeadFolder(leadId, leadName);
  const result = await client
    .api(`/drives/${DRIVE_ID}/items/${folder.id}/createLink`)
    .post({ type: "view", scope: "organization" });
  return result?.link?.webUrl;
}
