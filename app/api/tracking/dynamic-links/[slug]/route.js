import { NextResponse } from "next/server";

const resolveBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

const buildHeaders = () => {
  const apiKey = String(process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || "").trim();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
};

export async function PATCH(req, { params }) {
  try {
    const { slug } = await params;
    const baseUrl = resolveBaseUrl();
    const body = await req.json();
    const url = `${baseUrl}/internal/links/${encodeURIComponent(slug)}`;

    const upstream = await fetch(url, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(body || {}),
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
      { error: error instanceof Error ? error.message : "Failed to update dynamic link" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { slug } = await params;
    const baseUrl = resolveBaseUrl();
    const url = `${baseUrl}/internal/links/${encodeURIComponent(slug)}`;

    const upstream = await fetch(url, {
      method: "DELETE",
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
      { error: error instanceof Error ? error.message : "Failed to delete dynamic link" },
      { status: 500 }
    );
  }
}
