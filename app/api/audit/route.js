import { NextResponse } from "next/server";

const AUDIT_API_BASE_URL = process.env.AUDIT_API_BASE_URL || "https://oap-2.zapto.org/api/v2/audit";
const AUDIT_API_TOKEN = process.env.AUDIT_API_TOKEN;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10000";
    const moduleName = searchParams.get("module_name") || "tournament";

    const url = new URL(AUDIT_API_BASE_URL);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", limit);
    url.searchParams.set("module_name", moduleName);

    const headers = {};
    if (AUDIT_API_TOKEN) {
      headers.Authorization = `Bearer ${AUDIT_API_TOKEN}`;
    }

    const upstreamResponse = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const payload = await upstreamResponse.json().catch(() => null);

    return NextResponse.json(
      payload ?? { status: 0, message: "Empty response from audit API" },
      { status: upstreamResponse.status || 500 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching audit logs from external API:", error);

    return NextResponse.json(
      {
        status: 0,
        message: "Failed to fetch audit logs",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
