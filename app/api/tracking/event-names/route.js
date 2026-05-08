import { NextResponse } from "next/server";

const getBaseUrl = () => {
  const baseUrl = String(process.env.TRACKING_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Missing TRACKING_BASE_URL");
  }
  return baseUrl;
};

export async function GET() {
  try {
    const baseUrl = getBaseUrl();
    const apiKey = String(process.env.TRACKING_API_KEY || "").trim();

    const headers = {
      Accept: "application/json",
    };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const candidates = [
      `${baseUrl}/event-names`,
      `${baseUrl}/api/event-names`,
      "http://localhost:3001/api/event-names",
      "http://localhost:3001/event-names",
    ];

    let lastResponse = null;
    for (const url of candidates) {
      const upstream = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (upstream.ok) {
        const text = await upstream.text();
        const contentType = upstream.headers.get("content-type") || "application/json";
        return new NextResponse(text, {
          status: upstream.status,
          headers: {
            "content-type": contentType,
          },
        });
      }

      lastResponse = upstream;
    }

    const fallbackText = lastResponse
      ? await lastResponse.text()
      : JSON.stringify({ error: "Failed to load event names" });
    const fallbackType = lastResponse?.headers.get("content-type") || "application/json";

    return new NextResponse(fallbackText, {
      status: lastResponse?.status || 502,
      headers: {
        "content-type": fallbackType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load event names",
      },
      { status: 500 }
    );
  }
}
