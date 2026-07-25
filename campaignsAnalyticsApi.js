"use client";

const parseResponse = async (response, fallbackMessage) => {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.error || data?.message || fallbackMessage || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

export const fetchCampaignLinks = async (linkType = "") => {
  const sp = new URLSearchParams();
  const type = String(linkType || "").trim();
  if (type) sp.set("linkType", type);
  const query = sp.toString();
  const response = await fetch(
    query ? `/api/tracking/campaign-links?${query}` : "/api/tracking/campaign-links",
    {
      method: "GET",
      cache: "no-store",
    }
  );
  return parseResponse(response, "Failed to load campaign links");
};

export const fetchCampaignLinkStats = async (linkId) => {
  const id = String(linkId || "").trim();
  if (!id) throw new Error("linkId is required");

  const response = await fetch(`/api/tracking/campaign-links/stats/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
  });
  return parseResponse(response, "Failed to load link stats");
};
