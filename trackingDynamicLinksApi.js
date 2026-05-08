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
    const message = data?.error || fallbackMessage || `Dynamic links request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

export const fetchDynamicLinks = async () => {
  const response = await fetch("/api/tracking/dynamic-links", {
    method: "GET",
    cache: "no-store",
  });
  return parseResponse(response, "Failed to load dynamic links");
};

export const createDynamicLink = async (payload) => {
  const response = await fetch("/api/tracking/dynamic-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return parseResponse(response, "Failed to create dynamic link");
};

export const updateDynamicLink = async (slug, payload) => {
  const response = await fetch(`/api/tracking/dynamic-links/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return parseResponse(response, "Failed to update dynamic link");
};

export const deleteDynamicLink = async (slug) => {
  const response = await fetch(`/api/tracking/dynamic-links/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete dynamic link");
};
