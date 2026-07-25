export const maxDuration = 300;

function safeUploadUrl(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:") {
    throw new Error("Invalid Google Drive upload URL.");
  }
  const allowedHosts = [
    "www.googleapis.com",
    "drive.usercontent.google.com",
    "content.googleapis.com",
  ];
  if (
    !allowedHosts.includes(url.hostname) &&
    !url.hostname.endsWith(".googleapis.com") &&
    !url.hostname.endsWith(".googleusercontent.com")
  ) {
    throw new Error("Invalid Google Drive upload host.");
  }
  return url.toString();
}

async function readGoogleResponse(response) {
  const text = await response.text().catch(() => "");
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return {
    uploadStatus: response.status,
    range: response.headers.get("range") || "",
    data,
    error: data?.error?.message || (!response.ok && response.status !== 308 ? text : ""),
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const uploadUrl = safeUploadUrl(body?.uploadUrl);
    const totalSize = Number(body?.totalSize || 0);
    if (!totalSize) {
      return Response.json({ error: "totalSize is required." }, { status: 400 });
    }

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": "0",
        "Content-Range": `bytes */${totalSize}`,
      },
      redirect: "manual",
    });
    return Response.json(await readGoogleResponse(response));
  } catch (error) {
    return Response.json(
      { error: error?.message || "Could not check Google Drive upload status." },
      { status: 502 }
    );
  }
}

export async function PUT(req) {
  try {
    const uploadUrl = safeUploadUrl(req.headers.get("x-google-upload-url"));
    const contentRange = req.headers.get("content-range");
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    if (!contentRange) {
      return Response.json({ error: "Content-Range is required." }, { status: 400 });
    }

    // Only one chunk is buffered at a time; the complete file never enters server memory.
    const chunk = Buffer.from(await req.arrayBuffer());
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunk.length),
        "Content-Range": contentRange,
      },
      body: chunk,
      redirect: "manual",
    });
    return Response.json(await readGoogleResponse(response));
  } catch (error) {
    return Response.json(
      { error: error?.message || "Google Drive chunk upload failed." },
      { status: 502 }
    );
  }
}
