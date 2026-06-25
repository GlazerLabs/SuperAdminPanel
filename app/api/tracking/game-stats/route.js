import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const baseUrl = String(
      process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || ""
    )
      .trim()
      .replace(/\/$/, "");
    if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");

    const incoming = req.nextUrl.searchParams;
    const eventName = incoming.get("eventName");
    if (!eventName) {
      return NextResponse.json({ error: "eventName is required" }, { status: 400 });
    }

    const sp = new URLSearchParams();
    sp.set("eventName", eventName);
    for (const key of ["from", "to"]) {
      const value = incoming.get(key);
      if (value) sp.set(key, value);
    }

    const url = `${baseUrl}/events/game-stats?${sp.toString()}`;

    const apiKey = String(
      process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || ""
    ).trim();
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
      { error: error instanceof Error ? error.message : "Failed to load game stats" },
      { status: 500 }
    );
  }
}
