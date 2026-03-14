import { NextResponse } from "next/server";

const LEADS_API_BASE_URL =
  process.env.LEADS_API_BASE_URL || "https://oap-2.zapto.org/api/v2/lead-tracking";

// Keep the sensitive bearer token out of the codebase.
// Set LEADS_API_TOKEN in your environment (e.g. .env.local).
const LEADS_API_TOKEN = process.env.LEADS_API_TOKEN;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";

    const url = new URL(LEADS_API_BASE_URL);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", limit);

    const headers = {};
    if (LEADS_API_TOKEN) {
      headers.Authorization = `Bearer ${LEADS_API_TOKEN}`;
    }

    const upstreamResponse = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const payload = await upstreamResponse.json().catch(() => null);

    return NextResponse.json(
      payload ?? { status: 0, message: "Empty response from lead tracking API" },
      { status: upstreamResponse.status || 500 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching leads from external API:", error);

    return NextResponse.json(
      {
        status: 0,
        message: "Failed to fetch leads",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

