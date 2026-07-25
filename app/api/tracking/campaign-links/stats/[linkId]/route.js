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

export async function GET(_req, { params }) {
  try {
    const { linkId: rawLinkId } = await params;
    const linkId = String(rawLinkId || "").trim();
    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const baseUrl = resolveBaseUrl();
    const url = `${baseUrl}/api/links/stats/${encodeURIComponent(linkId)}`;

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
      { error: error instanceof Error ? error.message : "Failed to load link stats" },
      { status: 500 }
    );
  }
}
