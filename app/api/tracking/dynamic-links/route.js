import { NextResponse } from "next/server";

const buildCandidateUrls = (baseUrl) => {
  return [
    `${baseUrl}/dynamic-links`,
    `http://localhost:3001/api/dynamic-links`,
  ];
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

const resolveBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");
  return baseUrl;
};

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

  return new NextResponse(lastText || JSON.stringify({ error: "Dynamic links endpoint not found" }), {
    status: lastStatus,
    headers: { "content-type": lastContentType },
  });
};

export async function GET() {
  try {
    const baseUrl = resolveBaseUrl();
    const candidates = buildCandidateUrls(baseUrl);

    return tryCandidates(candidates, {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dynamic links" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const baseUrl = resolveBaseUrl();
    const body = await req.json();
    const candidates = buildCandidateUrls(baseUrl);

    return tryCandidates(candidates, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body || {}),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create dynamic link" },
      { status: 500 }
    );
  }
}
