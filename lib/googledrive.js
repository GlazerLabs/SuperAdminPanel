import { google } from "googleapis";
import { Readable } from "node:stream";

const DEFAULT_SUBFOLDERS = ["Inward", "Outward", "Invoices", "Others"];
const CHUNK_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4 MB
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_FIELDS = "id, name, webViewLink, mimeType, parents";

function normalizeRootFolderId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const fromUrl = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (fromUrl?.[1]) return fromUrl[1];
  const fromOpen = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fromOpen?.[1]) return fromOpen[1];
  return value;
}

const ROOT_FOLDER_ID = normalizeRootFolderId(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
const SHARE_DOMAIN = String(process.env.GOOGLE_DRIVE_SHARE_DOMAIN || "glazer.games").trim();

function normalizeSubfolderName(rawSubfolder) {
  const normalized = String(rawSubfolder || "").trim().toLowerCase();
  if (!normalized) return "Others";

  if (["inward", "inwards"].includes(normalized)) return "Inward";
  if (["outward", "outwards"].includes(normalized)) return "Outward";
  if (["invoice", "invoices"].includes(normalized)) return "Invoices";
  if (["other", "others"].includes(normalized)) return "Others";
  return "Others";
}

function sanitizeFolderName(name) {
  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|#%&{}~]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function getLeadFolderName(leadId, leadName) {
  const safeLeadName = sanitizeFolderName(leadName);
  return safeLeadName || `Lead-${leadId}`;
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google Drive OAuth credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN).");
  }
  if (!ROOT_FOLDER_ID) {
    throw new Error("Missing GOOGLE_DRIVE_ROOT_FOLDER_ID.");
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getOAuthClient() });
}

const driveSupports = {
  supportsAllDrives: true,
};

const driveListOpts = {
  ...driveSupports,
  includeItemsFromAllDrives: true,
  spaces: "drive",
};

async function listChildrenFolders(drive, parentId) {
  const items = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      ...driveListOpts,
      q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
      fields: "nextPageToken, files(id, name, webViewLink, mimeType)",
      pageSize: 1000,
      pageToken,
    });
    items.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return items;
}

function findFolderInItems(items, leadId, targetName) {
  const byName = items.find(
    (item) => String(item.name || "").trim().toLowerCase() === targetName.toLowerCase()
  );
  if (byName) return byName;

  const legacyPrefix = `${leadId} - `;
  return items.find((item) => String(item.name || "").startsWith(legacyPrefix)) || null;
}

async function createFolderUnder(drive, parentId, folderName) {
  const res = await drive.files.create({
    ...driveSupports,
    requestBody: {
      name: folderName,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: DRIVE_FIELDS,
  });
  return res.data;
}

async function ensureSubfolders(drive, parentFolderId) {
  const existing = await listChildrenFolders(drive, parentFolderId);
  const existingNames = new Set(existing.map((f) => String(f.name || "").trim().toLowerCase()));

  await Promise.all(
    DEFAULT_SUBFOLDERS.map(async (name) => {
      if (existingNames.has(name.toLowerCase())) return null;
      try {
        return await createFolderUnder(drive, parentFolderId, name);
      } catch {
        return null;
      }
    })
  );
}

async function findChildFolderByName(drive, parentId, name) {
  const escaped = String(name).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    ...driveListOpts,
    q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME}' and name = '${escaped}' and trashed = false`,
    fields: "files(id, name, webViewLink)",
    pageSize: 10,
  });
  return res.data.files?.[0] || null;
}

async function ensureNamedSubfolder(drive, leadFolderId, subfolderName) {
  const existing = await findChildFolderByName(drive, leadFolderId, subfolderName);
  if (existing) return existing;
  return createFolderUnder(drive, leadFolderId, subfolderName);
}

async function findFileByName(drive, parentId, fileName) {
  const escaped = String(fileName).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    ...driveListOpts,
    q: `'${parentId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name, webViewLink)",
    pageSize: 10,
  });
  return res.data.files?.[0] || null;
}

function extractWebUrl(obj) {
  const w = obj?.webViewLink || obj?.webUrl;
  return typeof w === "string" && w.trim() ? w.trim() : null;
}

async function ensureDomainShare(drive, fileId) {
  if (!fileId || !SHARE_DOMAIN) return;
  try {
    await drive.permissions.create({
      ...driveSupports,
      fileId,
      requestBody: {
        type: "domain",
        role: "reader",
        domain: SHARE_DOMAIN,
        allowFileDiscovery: false,
      },
      sendNotificationEmail: false,
    });
  } catch {
    // already shared or not allowed — ignore
  }
}

export async function ensureLeadFolder(leadId, leadName, { skipSubfolders = false } = {}) {
  const drive = getDriveClient();
  const targetName = getLeadFolderName(leadId, leadName);
  const items = await listChildrenFolders(drive, ROOT_FOLDER_ID);

  let folder = findFolderInItems(items, leadId, targetName);
  const isNewFolder = !folder;

  if (!folder) {
    folder = await createFolderUnder(drive, ROOT_FOLDER_ID, targetName);
  }

  if (isNewFolder || !skipSubfolders) {
    await ensureSubfolders(drive, folder.id);
  }

  return folder;
}

export async function renameLeadFolder(leadId, leadName, previousLeadName = "") {
  const drive = getDriveClient();
  const newName = getLeadFolderName(leadId, leadName);
  const oldName = getLeadFolderName(leadId, previousLeadName);

  const items = await listChildrenFolders(drive, ROOT_FOLDER_ID);

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
    await drive.files.update({
      ...driveSupports,
      fileId: folder.id,
      requestBody: { name: newName },
      fields: DRIVE_FIELDS,
    });
  }

  await ensureSubfolders(drive, folder.id);
  return { id: folder.id, name: newName };
}

async function uploadBufferToFolder(drive, parentFolderId, safeFileName, fileBuffer, mimeType) {
  const existing = await findFileByName(drive, parentFolderId, safeFileName);
  const media = {
    mimeType: mimeType || "application/octet-stream",
    body: Readable.from(fileBuffer),
  };

  if (existing?.id) {
    const res = await drive.files.update({
      ...driveSupports,
      fileId: existing.id,
      media,
      fields: DRIVE_FIELDS,
    });
    return res.data;
  }

  const res = await drive.files.create({
    ...driveSupports,
    requestBody: {
      name: safeFileName,
      parents: [parentFolderId],
    },
    media,
    fields: DRIVE_FIELDS,
  });
  return res.data;
}

export async function uploadFileToLeadFolder(leadId, leadName, subfolder, fileName, fileBuffer, mimeType) {
  const drive = getDriveClient();
  const folder = await ensureLeadFolder(leadId, leadName, { skipSubfolders: true });
  const targetSubfolder = normalizeSubfolderName(subfolder);
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;
  const sub = await ensureNamedSubfolder(drive, folder.id, targetSubfolder);

  const uploaded = await uploadBufferToFolder(drive, sub.id, safeFileName, fileBuffer, mimeType);

  let fileWebUrl = extractWebUrl(uploaded);
  if (uploaded?.id && !fileWebUrl) {
    fileWebUrl = await resolveFileWebUrl(uploaded.id);
  } else if (uploaded?.id) {
    await ensureDomainShare(drive, uploaded.id);
  }

  return {
    folderId: folder.id,
    subfolder: targetSubfolder,
    fileName: safeFileName,
    ...(fileWebUrl ? { fileWebUrl } : {}),
  };
}

export async function streamUploadToLeadFolder(leadId, leadName, subfolder, fileName, file, mimeType, onProgress) {
  onProgress?.({ stage: "preparing", percent: 0 });

  const drive = getDriveClient();
  const folder = await ensureLeadFolder(leadId, leadName, { skipSubfolders: true });
  const targetSubfolder = normalizeSubfolderName(subfolder);
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;

  onProgress?.({ stage: "creating_session", percent: 2 });
  const sub = await ensureNamedSubfolder(drive, folder.id, targetSubfolder);

  onProgress?.({ stage: "uploading", percent: 5 });
  const buffer = Buffer.from(await file.arrayBuffer());
  onProgress?.({ stage: "uploading", percent: 50 });

  const uploaded = await uploadBufferToFolder(drive, sub.id, safeFileName, buffer, mimeType || file.type);

  onProgress?.({ stage: "finalizing", percent: 96 });

  let fileWebUrl = extractWebUrl(uploaded);
  if (uploaded?.id && !fileWebUrl) {
    fileWebUrl = await resolveFileWebUrl(uploaded.id);
  } else if (uploaded?.id) {
    await ensureDomainShare(drive, uploaded.id);
  }

  onProgress?.({ stage: "done", percent: 100 });

  return {
    folderId: folder.id,
    subfolder: targetSubfolder,
    fileName: safeFileName,
    ...(fileWebUrl ? { fileWebUrl } : {}),
  };
}

export async function createDirectUploadSession(leadId, leadName, subfolder, fileName, fileSize = 0, mimeType = "") {
  const auth = getOAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const folder = await ensureLeadFolder(leadId, leadName);
  const targetSubfolder = normalizeSubfolderName(subfolder);
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;
  const sub = await ensureNamedSubfolder(drive, folder.id, targetSubfolder);

  const existing = await findFileByName(drive, sub.id, safeFileName);
  const token = await auth.getAccessToken();
  const accessToken = typeof token === "string" ? token : token?.token;
  if (!accessToken) throw new Error("Failed to obtain Google Drive access token.");

  const contentType = mimeType || "application/octet-stream";
  const params = new URLSearchParams({
    uploadType: "resumable",
    supportsAllDrives: "true",
    fields: "id,name,webViewLink",
  });

  let initUrl;
  let method;
  let body;

  if (existing?.id) {
    initUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?${params}`;
    method = "PATCH";
    body = JSON.stringify({ name: safeFileName });
  } else {
    initUrl = `https://www.googleapis.com/upload/drive/v3/files?${params}`;
    method = "POST";
    body = JSON.stringify({
      name: safeFileName,
      parents: [sub.id],
    });
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": contentType,
  };
  if (fileSize > 0) {
    headers["X-Upload-Content-Length"] = String(fileSize);
  }

  const initRes = await fetch(initUrl, { method, headers, body });
  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => "");
    throw new Error(`Failed to create upload session (${initRes.status}): ${errText}`);
  }

  const uploadUrl = initRes.headers.get("location") || initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("Failed to create upload session.");

  return {
    uploadUrl,
    folderId: folder.id,
    subfolder: targetSubfolder,
    fileName: safeFileName,
  };
}

export async function resolveFileWebUrl(itemId) {
  if (!itemId) return null;
  const drive = getDriveClient();

  try {
    await ensureDomainShare(drive, itemId);
  } catch {
    // ignore
  }

  try {
    const meta = await drive.files.get({
      ...driveSupports,
      fileId: itemId,
      fields: "id, webViewLink",
    });
    return extractWebUrl(meta.data);
  } catch {
    return null;
  }
}

export async function getLeadFolderLink(leadId, leadName) {
  const drive = getDriveClient();
  const folder = await ensureLeadFolder(leadId, leadName);

  try {
    await ensureDomainShare(drive, folder.id);
  } catch {
    // ignore
  }

  const meta = await drive.files.get({
    ...driveSupports,
    fileId: folder.id,
    fields: "id, webViewLink",
  });

  return extractWebUrl(meta.data) || `https://drive.google.com/drive/folders/${folder.id}`;
}
