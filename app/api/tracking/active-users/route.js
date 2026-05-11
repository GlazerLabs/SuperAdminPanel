import { NextResponse } from "next/server";

const ALLOWED_TYPES = new Set(["dau", "wau", "mau"]);

export async function GET(req) {
  try {
    const baseUrl = String(process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
    if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");

    const incoming = req.nextUrl.searchParams;
    const type = incoming.get("type");
    if (type && !ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: "type must be dau, wau, mau, or omitted" },
        { status: 400 }
      );
    }

    const sp = new URLSearchParams();
    const passthroughKeys = ["type", "from", "to", "eventName", "platform", "appVersion"];
    for (const key of passthroughKeys) {
      const value = incoming.get(key);
      if (value) sp.set(key, value);
    }

    const qs = sp.toString();
    const url = `${baseUrl}/active-users${qs ? `?${qs}` : ""}`;

    const apiKey = String(process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || "").trim();
    const headers = { Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

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
      { error: error instanceof Error ? error.message : "Failed to load active users" },
      { status: 500 }
    );
  }
}
