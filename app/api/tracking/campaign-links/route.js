import { NextResponse } from "next/server";

const buildHeaders = () => {
  const apiKey = String(
    process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || ""
  ).trim();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
};

const resolveBaseUrl = () => {
  const baseUrl = String(
    process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

export async function GET(req) {
  try {
    const baseUrl = resolveBaseUrl();
    const linkType = String(req.nextUrl.searchParams.get("linkType") || "").trim();
    const sp = new URLSearchParams();
    if (linkType) sp.set("linkType", linkType);
    const url = sp.toString() ? `${baseUrl}/api/links?${sp.toString()}` : `${baseUrl}/api/links`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
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
      { error: error instanceof Error ? error.message : "Failed to load campaign links" },
      { status: 500 }
    );
  }
}
