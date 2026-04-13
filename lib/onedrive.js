import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const DRIVE_ID = process.env.ONEDRIVE_DRIVE_ID;
const DEFAULT_SUBFOLDERS = ["In", "Out", "invoice", "other"];

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

async function findLeadFolderById(client, leadId) {
  const rootFolderId = await ensureRootFolder(client);
  const response = await client.api(`/drives/${DRIVE_ID}/items/${rootFolderId}/children`).get();

  const items = Array.isArray(response?.value) ? response.value : [];
  const legacyPrefix = `${leadId} - `;
  return items.find((item) => item?.folder && String(item.name || "").startsWith(legacyPrefix)) || null;
}

async function findFolderByName(client, folderName) {
  const normalizedTarget = normalizeComparableName(folderName);
  if (!normalizedTarget) return null;
  const rootFolderId = await ensureRootFolder(client);
  const response = await client.api(`/drives/${DRIVE_ID}/items/${rootFolderId}/children`).get();
  const items = Array.isArray(response?.value) ? response.value : [];
  return (
    items.find(
      (item) => item?.folder && normalizeComparableName(item.name || "") === normalizedTarget
    ) || null
  );
}

async function ensureRootFolder(client) {
  const rootItem = await client.api(`/drives/${DRIVE_ID}/root`).get();
  return rootItem.id;
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

export async function ensureLeadFolder(leadId, leadName) {
  const client = getGraphClient();
  const targetName = getLeadFolderName(leadId, leadName);
  const rootFolderId = await ensureRootFolder(client);

  const children = await client.api(`/drives/${DRIVE_ID}/items/${rootFolderId}/children`).get();
  const items = Array.isArray(children?.value) ? children.value : [];
  let folder =
    items.find((item) => item?.folder && String(item.name || "").trim().toLowerCase() === targetName.toLowerCase()) ||
    (await findLeadFolderById(client, leadId));

  if (!folder) {
    folder = await createFolderUnder(
      client,
      `/drives/${DRIVE_ID}/items/${rootFolderId}/children`,
      targetName,
      "rename"
    );
  }

  await ensureSubfolders(client, folder.id);
  return folder;
}

export async function renameLeadFolder(leadId, leadName, previousLeadName = "") {
  const client = getGraphClient();
  const newName = getLeadFolderName(leadId, leadName);
  const oldName = getLeadFolderName(leadId, previousLeadName);

  let folder = await findFolderByName(client, oldName);
  if (!folder) {
    folder = await findLeadFolderById(client, leadId);
  }
  if (!folder) {
    folder = await findFolderByName(client, newName);
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

export async function uploadFileToLeadFolder(leadId, leadName, subfolder, fileName, fileBuffer, mimeType) {
  const client = getGraphClient();
  const folder = await ensureLeadFolder(leadId, leadName);
  const targetSubfolder = DEFAULT_SUBFOLDERS.includes(subfolder) ? subfolder : "other";
  const safeFileName = sanitizeFolderName(fileName) || `upload-${Date.now()}`;
  const path = `/drives/${DRIVE_ID}/items/${folder.id}:/${targetSubfolder}/${safeFileName}:/content`;
  await client.api(path).header("Content-Type", mimeType || "application/octet-stream").put(fileBuffer);
  return { folderId: folder.id, subfolder: targetSubfolder, fileName: safeFileName };
}

export async function getLeadFolderLink(leadId, leadName) {
  const client = getGraphClient();
  const folder = await ensureLeadFolder(leadId, leadName);
  const result = await client
    .api(`/drives/${DRIVE_ID}/items/${folder.id}/createLink`)
    .post({ type: "view", scope: "organization" });
  return result?.link?.webUrl;
}
