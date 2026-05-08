"use client";

export const fetchTrackingFunnel = async (payload) => {
  const response = await fetch("/api/tracking/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch funnel data");
  }

  return data;
};
