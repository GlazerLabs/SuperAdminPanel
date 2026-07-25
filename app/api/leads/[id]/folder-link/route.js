import { NextResponse } from "next/server";
import { getLeadFolderLink } from "@/lib/googledrive";

async function resolveLeadId(params) {
  const resolved = await Promise.resolve(params);
  return resolved?.id ? String(resolved.id) : "";
}

export async function GET(req, { params }) {
  try {
    const leadId = await resolveLeadId(params);
    if (!leadId) {
      return NextResponse.json({ error: "Lead id is required." }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const leadName = searchParams.get("leadName") || `Lead-${leadId}`;
    const url = await getLeadFolderLink(leadId, leadName);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Google Drive folder-link error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate Google Drive link." }, { status: 500 });
  }
}
