"use client";

export const fetchTrackingEventNames = async () => {
  const response = await fetch("/api/tracking/event-names", {
    method: "GET",
    cache: "no-store",
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to fetch event names");
  }

  return payload;
};
