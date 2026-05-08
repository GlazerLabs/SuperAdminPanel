"use client";

const buildQueryString = (query = {}) => {
  const sp = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

export const fetchInstallsDateWise = async (query = {}) => {
  const response = await fetch(`/api/tracking/installs-date-wise${buildQueryString(query)}`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.error || `Installs request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};
