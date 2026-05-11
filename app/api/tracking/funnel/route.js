import { NextResponse } from "next/server";

const getBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

export async function POST(req) {
  try {
    const body = await req.json();
    const baseUrl = getBaseUrl();
    const apiKey = String(process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || "").trim();

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const url = `${baseUrl}/events/funnel`;

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
      { error: error instanceof Error ? error.message : "Failed to load funnel" },
      { status: 500 }
    );
  }
}
