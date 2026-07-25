const CHUNK_SIZE = 16 * 256 * 1024; // 4 MiB — safe for serverless request limits
const MAX_CHUNK_RETRIES = 5;
const MAX_SESSION_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUploadedBytesFromRange(rangeHeader) {
  if (!rangeHeader || typeof rangeHeader !== "string") return 0;
  // Example: "bytes=0-2097151"
  const match = rangeHeader.match(/bytes=(\d+)-(\d+)/i);
  if (!match) return 0;
  return Number(match[2]) + 1;
}

function xhrRequest({
  url,
  method = "PUT",
  headers = {},
  body = null,
  onUploadProgress,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    Object.entries(headers).forEach(([key, value]) => {
      if (value != null && value !== "") {
        xhr.setRequestHeader(key, String(value));
      }
    });

    if (onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onUploadProgress(event.loaded, event.total);
      };
    }

    xhr.onerror = () => reject(new Error("Google Drive upload failed due to a network error."));
    xhr.onabort = () => reject(new Error("Google Drive upload was cancelled."));
    xhr.onload = () => {
      let data = null;
      const text = xhr.responseText || "";
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      resolve({
        status: xhr.status,
        headers: {
          range: xhr.getResponseHeader("Range") || xhr.getResponseHeader("range") || "",
        },
        data,
        raw: text,
      });
    };

    xhr.send(body);
  });
}

async function queryUploadedBytes(leadId, uploadUrl, totalSize) {
  try {
    const response = await fetch(`/api/leads/${leadId}/upload-chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadUrl, totalSize }),
    });
    const res = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(res?.error || "Could not check upload status.");

    // 308 Resume Incomplete → Range header tells us what Google already has
    if (res.uploadStatus === 308 || res.uploadStatus === 200 || res.uploadStatus === 201) {
      if (res.uploadStatus === 200 || res.uploadStatus === 201) {
        return { complete: true, uploadedBytes: totalSize, file: res.data };
      }
      return {
        complete: false,
        uploadedBytes: parseUploadedBytesFromRange(res.range),
        file: null,
      };
    }

    // Some environments return 404/410 when session expired
    if (res.uploadStatus === 404 || res.uploadStatus === 410) {
      return { complete: false, uploadedBytes: 0, expired: true, file: null };
    }

    return { complete: false, uploadedBytes: 0, file: null };
  } catch {
    return { complete: false, uploadedBytes: 0, file: null };
  }
}

async function createUploadSession({ leadId, leadName, file, subfolder }) {
  const sessionRes = await fetch(`/api/leads/${leadId}/upload-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      subfolder,
      leadName,
    }),
  });
  const session = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok || !session?.uploadUrl) {
    throw new Error(session?.error || "Failed to prepare Google Drive upload.");
  }
  return session;
}

async function resolveUploadedFileLink(leadId, uploaded) {
  if (!uploaded?.id) {
    throw new Error("Google Drive uploaded the file but did not return its file ID.");
  }

  const linkRes = await fetch(`/api/leads/${leadId}/upload-session`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: uploaded.id }),
  });
  const linkData = await linkRes.json().catch(() => ({}));
  if (!linkRes.ok) {
    throw new Error(linkData?.error || "Could not create the Google Drive link.");
  }

  const fileWebUrl =
    (typeof linkData?.fileWebUrl === "string" && linkData.fileWebUrl.trim()) ||
    (typeof uploaded?.webViewLink === "string" && uploaded.webViewLink.trim()) ||
    "";
  if (!fileWebUrl) {
    throw new Error("Google Drive uploaded the file but did not return a view link.");
  }
  return fileWebUrl;
}

async function uploadChunkWithRetry({
  leadId,
  uploadUrl,
  chunk,
  start,
  end,
  totalSize,
  mimeType,
  onChunkProgress,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt += 1) {
    try {
      const res = await xhrRequest({
        url: `/api/leads/${leadId}/upload-chunk`,
        method: "PUT",
        headers: {
          "X-Google-Upload-Url": uploadUrl,
          "Content-Type": mimeType,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        },
        body: chunk,
        onUploadProgress: (loaded) => {
          onChunkProgress?.(start + loaded);
        },
      });

      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.data?.error || `Upload proxy failed (${res.status}).`);
      }

      const uploadStatus = res.data?.uploadStatus;

      // Incomplete — Google accepted this chunk
      if (uploadStatus === 308) {
        const confirmed = parseUploadedBytesFromRange(res.data?.range);
        return {
          done: false,
          nextOffset: confirmed > 0 ? confirmed : end + 1,
          file: null,
        };
      }

      // Complete
      if (uploadStatus === 200 || uploadStatus === 201) {
        return { done: true, nextOffset: totalSize, file: res.data?.data };
      }

      // Session gone — caller should recreate
      if (uploadStatus === 404 || uploadStatus === 410) {
        const err = new Error("Google Drive upload session expired.");
        err.code = "SESSION_EXPIRED";
        throw err;
      }

      const message =
        res.data?.error ||
        `Google Drive upload failed (${uploadStatus || "unknown"}).`;
      throw new Error(message);
    } catch (error) {
      lastError = error;
      if (error?.code === "SESSION_EXPIRED") throw error;

      // Ask Google how far we got, then retry remaining bytes
      if (attempt < MAX_CHUNK_RETRIES) {
        onChunkProgress?.(start, `Network issue — retrying chunk (${attempt}/${MAX_CHUNK_RETRIES})…`);
        await sleep(700 * attempt);
        const status = await queryUploadedBytes(leadId, uploadUrl, totalSize);
        if (status.expired) {
          const err = new Error("Google Drive upload session expired.");
          err.code = "SESSION_EXPIRED";
          throw err;
        }
        if (status.complete && status.file) {
          return { done: true, nextOffset: totalSize, file: status.file };
        }
        if (status.uploadedBytes > start) {
          return { done: false, nextOffset: status.uploadedBytes, file: null };
        }
        continue;
      }
    }
  }

  throw lastError || new Error("Google Drive upload failed due to a network error.");
}

async function uploadFileWithSession({
  leadId,
  session,
  file,
  onProgress,
}) {
  const totalSize = file.size;
  const mimeType = file.type || "application/octet-stream";
  let offset = 0;
  let uploadedFile = null;

  // Resume if Google already received some bytes (reconnect case)
  const initial = await queryUploadedBytes(leadId, session.uploadUrl, totalSize);
  if (initial.complete && initial.file) {
    return initial.file;
  }
  if (initial.uploadedBytes > 0) {
    offset = initial.uploadedBytes;
    onProgress?.(Math.min(95, Math.round((offset / totalSize) * 95)), "Resuming Google Drive upload…");
  }

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize) - 1;
    const chunk = file.slice(offset, end + 1);

    const result = await uploadChunkWithRetry({
      leadId,
      uploadUrl: session.uploadUrl,
      chunk,
      start: offset,
      end,
      totalSize,
      mimeType,
      onChunkProgress: (bytesSent, stage) => {
        const percent = Math.min(95, Math.max(1, Math.round((bytesSent / totalSize) * 95)));
        onProgress?.(percent, stage || "Uploading to Google Drive…");
      },
    });

    if (result.done) {
      uploadedFile = result.file;
      offset = totalSize;
      break;
    }

    // Prefer Google's confirmed offset; otherwise move past this chunk
    offset =
      typeof result.nextOffset === "number" && result.nextOffset > offset
        ? result.nextOffset
        : end + 1;
    const percent = Math.min(95, Math.max(1, Math.round((offset / totalSize) * 95)));
    onProgress?.(percent, "Uploading to Google Drive…");
  }

  if (!uploadedFile?.id) {
    // Final status check — sometimes last 308 then complete on query
    const finalStatus = await queryUploadedBytes(leadId, session.uploadUrl, totalSize);
    if (finalStatus.complete && finalStatus.file) {
      uploadedFile = finalStatus.file;
    }
  }

  if (!uploadedFile?.id) {
    throw new Error("Google Drive uploaded the file but did not return its file ID.");
  }

  return uploadedFile;
}

export async function uploadFileDirectToGoogleDrive({
  leadId,
  leadName,
  file,
  subfolder,
  onProgress,
}) {
  if (!leadId || !file) {
    throw new Error("Lead and file are required.");
  }

  onProgress?.(1, "Preparing Google Drive upload…");

  let lastError = null;

  for (let sessionAttempt = 1; sessionAttempt <= MAX_SESSION_RETRIES; sessionAttempt += 1) {
    try {
      const session = await createUploadSession({ leadId, leadName, file, subfolder });
      onProgress?.(2, "Uploading to Google Drive…");

      const uploaded = await uploadFileWithSession({
        leadId,
        session,
        file,
        onProgress,
      });

      onProgress?.(97, "Finalizing Google Drive link…");
      const fileWebUrl = await resolveUploadedFileLink(leadId, uploaded);
      onProgress?.(100, "Upload complete");

      return {
        fileWebUrl,
        fileId: uploaded.id,
        folderId: session.folderId,
        fileName: session.fileName,
        subfolder: session.subfolder,
      };
    } catch (error) {
      lastError = error;
      const canRetrySession =
        error?.code === "SESSION_EXPIRED" ||
        /network error/i.test(String(error?.message || ""));

      if (canRetrySession && sessionAttempt < MAX_SESSION_RETRIES) {
        onProgress?.(
          2,
          `Connection lost — restarting upload (${sessionAttempt}/${MAX_SESSION_RETRIES})…`
        );
        await sleep(1000 * sessionAttempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Google Drive upload failed due to a network error.");
}
