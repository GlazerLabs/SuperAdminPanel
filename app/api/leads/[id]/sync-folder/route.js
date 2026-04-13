import { NextResponse } from "next/server";
import { ensureLeadFolder, renameLeadFolder } from "@/lib/onedrive";

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

    const body = await req.json().catch(() => ({}));
    const leadName = body?.leadName || body?.activityName || body?.name || `Lead-${leadId}`;
    const action = body?.action || "create";

    const previousLeadName = body?.previousLeadName || body?.oldLeadName || "";
    const result =
      action === "rename"
        ? await renameLeadFolder(leadId, leadName, previousLeadName)
        : await ensureLeadFolder(leadId, leadName);

    return NextResponse.json({ ok: true, folderId: result?.id, folderName: result?.name || "" });
  } catch (error) {
    console.error("OneDrive sync folder error:", error);
    return NextResponse.json({ error: error?.message || "Failed to sync OneDrive folder." }, { status: 500 });
  }
}
