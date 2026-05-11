import { NextResponse } from "next/server";

const getBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

export async function GET() {
  try {
    const baseUrl = getBaseUrl();
    const apiKey = String(process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || "").trim();

    const headers = { Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const url = `${baseUrl}/events/eventNames`;

    const upstream = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load event names" },
      { status: 500 }
    );
  }
}
