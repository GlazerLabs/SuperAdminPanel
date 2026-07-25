import { uploadFileToLeadFolder } from "@/lib/googledrive";

export const maxDuration = 300;

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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFileToLeadFolder(
      leadId, leadName, subfolder, file.name, buffer, file.type
    );
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Google Drive upload error:", error);
    const msg =
      typeof error?.message === "string"
        ? error.message
        : String(error ?? "Upload failed.");
    return Response.json({ error: msg }, { status: 500 });
  }
}
