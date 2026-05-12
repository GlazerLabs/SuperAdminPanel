import { uploadFileToLeadFolder, streamUploadToLeadFolder } from "@/lib/onedrive";

export const maxDuration = 300;

const STREAM_THRESHOLD = 4 * 1024 * 1024;

async function resolveLeadId(params) {
  const resolved = await Promise.resolve(params);
  return resolved?.id ? String(resolved.id) : "";
}

export async function POST(req, { params }) {
  const leadId = await resolveLeadId(params);
  if (!leadId) {
    return Response.json({ error: "Lead id is required." }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const subfolder = String(formData.get("subfolder") || "Others");
  const leadName = String(formData.get("leadName") || `Lead-${leadId}`);

  if (!file || typeof file === "string") {
    return Response.json({ error: "File is required." }, { status: 400 });
  }

  if (file.size <= STREAM_THRESHOLD) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFileToLeadFolder(
        leadId, leadName, subfolder, file.name, buffer, file.type
      );
      return Response.json({ ok: true, ...result });
    } catch (error) {
      console.error("OneDrive upload error:", error);
      const msg = typeof error?.message === "string" ? error.message : String(error ?? "Upload failed.");
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await streamUploadToLeadFolder(
          leadId, leadName, subfolder, file.name, file, file.type,
          (progress) => send({ type: "progress", ...progress })
        );
        send({ type: "done", ok: true, ...result });
      } catch (error) {
        console.error("OneDrive upload error:", error);
        const msg = typeof error?.message === "string" ? error.message : String(error ?? "Upload failed.");
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
