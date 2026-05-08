import { NextResponse } from "next/server";

const getBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

export async function POST(req) {
  try {
    const body = await req.json();
    const baseUrl = getBaseUrl();
    const apiKey = String(process.env.TRACKING_API_KEY || "").trim();

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const candidates = [
      `${baseUrl}/events/funnel`,
      "http://localhost:3001/events/funnel",
      "http://localhost:3001/api/events/funnel",
    ];

    let lastResponse = null;
    for (const url of candidates) {
      const upstream = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (upstream.ok) {
        const text = await upstream.text();
        const contentType = upstream.headers.get("content-type") || "application/json";
        return new NextResponse(text, {
          status: upstream.status,
          headers: { "content-type": contentType },
        });
      }
      lastResponse = upstream;
    }

    const fallbackText = lastResponse ? await lastResponse.text() : JSON.stringify({ error: "Failed to load funnel" });
    const fallbackType = lastResponse?.headers.get("content-type") || "application/json";
    return new NextResponse(fallbackText, {
      status: lastResponse?.status || 502,
      headers: { "content-type": fallbackType },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load funnel" },
      { status: 500 }
    );
  }
}
