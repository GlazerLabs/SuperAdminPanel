import { NextResponse } from "next/server";
import { createDirectUploadSession, resolveFileWebUrl } from "@/lib/onedrive";

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

    const body = await req.json();
    const fileName = String(body.fileName || "").trim();
    const subfolder = String(body.subfolder || "Others");
    const leadName = String(body.leadName || `Lead-${leadId}`);
    const fileSize = Number(body.fileSize || 0);

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required." }, { status: 400 });
    }

    const session = await createDirectUploadSession(leadId, leadName, subfolder, fileName);
    return NextResponse.json({ ok: true, ...session, fileSize });
  } catch (error) {
    console.error("Upload session error:", error);
    const msg = typeof error?.message === "string" ? error.message : String(error ?? "Failed to create upload session.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const itemId = String(body.itemId || "").trim();
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required." }, { status: 400 });
    }

    const fileWebUrl = await resolveFileWebUrl(itemId);
    return NextResponse.json({ ok: true, fileWebUrl: fileWebUrl || "" });
  } catch (error) {
    console.error("Resolve URL error:", error);
    const msg = typeof error?.message === "string" ? error.message : String(error ?? "Failed to resolve file URL.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
