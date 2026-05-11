import { NextResponse } from "next/server";

const buildQueryString = (req) => {
  const incoming = req.nextUrl.searchParams;
  const sp = new URLSearchParams();
  const keys = ["from", "to", "eventName", "platform", "appVersion"];
  for (const key of keys) {
    const value = incoming.get(key);
    if (value) sp.set(key, value);
  }
  return sp.toString();
};

export async function GET(req) {
  try {
    const baseUrl = String(process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
    if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");

    const apiKey = String(process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || "").trim();
    const qs = buildQueryString(req);
    const suffix = qs ? `?${qs}` : "";

    const headers = { Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const url = `${baseUrl}/events/app-installed/date-wise${suffix}`;

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
      { error: error instanceof Error ? error.message : "Failed to load installs" },
      { status: 500 }
    );
  }
}
