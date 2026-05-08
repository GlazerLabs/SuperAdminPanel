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

const buildCandidateUrls = (baseUrl, qs) => {
  const suffix = qs ? `?${qs}` : "";
  return [
    `${baseUrl}/events/apps/installed/date-wise${suffix}`,
    `${baseUrl}/installs-date-wise${suffix}`,
    `http://localhost:3001/api/installs-date-wise${suffix}`,
  ];
};

export async function GET(req) {
  try {
    const baseUrl = String(process.env.TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
    if (!baseUrl) throw new Error("Missing TRACKING_BASE_URL");

    const apiKey = String(process.env.TRACKING_API_KEY || "").trim();
    const qs = buildQueryString(req);
    const candidates = buildCandidateUrls(baseUrl, qs);

    const headers = { Accept: "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    let lastStatus = 500;
    let lastText = "";
    let lastContentType = "application/json";

    for (const url of candidates) {
      const upstream = await fetch(url, { method: "GET", headers, cache: "no-store" });
      const text = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "application/json";

      if (upstream.ok) {
        return new NextResponse(text, {
          status: upstream.status,
          headers: { "content-type": contentType },
        });
      }

      // Stop trying alternatives for non-404 failures.
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

    return new NextResponse(lastText || JSON.stringify({ error: "Installs endpoint not found" }), {
      status: lastStatus,
      headers: { "content-type": lastContentType },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load installs" },
      { status: 500 }
    );
  }
}
