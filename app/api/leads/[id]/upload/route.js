import { NextResponse } from "next/server";
import { uploadFileToLeadFolder } from "@/lib/onedrive";

async function resolveLeadId(params) {
  const resolved = await Promise.resolve(params);
  return resolved?.id ? String(resolved.id) : "";
}

export async function POST(req, { params }) {
  try {
    const leadId = await resolveLeadId(params);
    if (!leadId) {
      return NextResponse.json({ error: "Lead id is required." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const subfolder = String(formData.get("subfolder") || "other");
    const leadName = String(formData.get("leadName") || `Lead-${leadId}`);

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFileToLeadFolder(
      leadId,
      leadName,
      subfolder,
      file.name,
      buffer,
      file.type
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("OneDrive upload error:", error);
    return NextResponse.json({ error: error?.message || "Failed to upload file." }, { status: 500 });
  }
}
