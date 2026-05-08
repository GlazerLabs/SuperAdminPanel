import { NextResponse } from "next/server";

const resolveBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

const buildHeaders = () => {
  const apiKey = String(process.env.TRACKING_API_KEY || "").trim();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey) headers["x-api-key"] = apiKey;
  return headers;
};

const buildCandidateUrls = (baseUrl, slug) => [
  `${baseUrl}/dynamic-links/${encodeURIComponent(slug)}`,
  `http://localhost:3001/api/dynamic-links/${encodeURIComponent(slug)}`,
];

const tryCandidates = async (candidates, init) => {
  let lastStatus = 500;
  let lastText = "";
  let lastContentType = "application/json";

  for (const url of candidates) {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    if (upstream.ok) {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": contentType },
      });
    }

    if (upstream.status !== 404) {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": contentType },
      });
    }

    lastStatus = upstream.status;
    lastText = text;
    lastContentType = contentType;
  }

  return new NextResponse(lastText || JSON.stringify({ error: "Dynamic link endpoint not found" }), {
    status: lastStatus,
    headers: { "content-type": lastContentType },
  });
};

export async function PATCH(req, { params }) {
  try {
    const { slug } = await params;
    const baseUrl = resolveBaseUrl();
    const body = await req.json();
    const candidates = buildCandidateUrls(baseUrl, slug);

    return tryCandidates(candidates, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(body || {}),
      cache: "no-store",
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
    const candidates = buildCandidateUrls(baseUrl, slug);

    return tryCandidates(candidates, {
      method: "DELETE",
      headers: buildHeaders(),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete dynamic link" },
      { status: 500 }
    );
  }
}
