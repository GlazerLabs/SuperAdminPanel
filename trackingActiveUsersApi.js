"use client";

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getPast7DaysRange = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 6);
  return {
    from: toYmd(fromDate),
    to: toYmd(toDate),
  };
};

// WAU should be roughly last 8 weeks so the start date aligns (e.g. for to=2026-05-07 => from=2026-03-13).
const getPast56DaysRange = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 55);
  return {
    from: toYmd(fromDate),
    to: toYmd(toDate),
  };
};

const getPast7MonthsRange = () => {
  const toDate = new Date();
  const fromDate = startOfMonth(toDate);
  // include current month + previous 6 months = 7 months window
  fromDate.setMonth(fromDate.getMonth() - 6);
  return {
    from: toYmd(fromDate),
    to: toYmd(toDate),
  };
};

const getDefaultRange = (type) => {
  if (type === "mau") return getPast7MonthsRange();
  if (type === "wau") return getPast56DaysRange();
  return getPast7DaysRange();
};

const buildQueryString = (query = {}) => {
  const type = query?.type;
  const merged = { ...getDefaultRange(type), ...query };
  const sp = new URLSearchParams();

  Object.entries(merged).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      sp.set(key, String(value));
    }
  });

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

export const fetchActiveUsers = async (query = {}) => {
  const response = await fetch(`/api/tracking/active-users${buildQueryString(query)}`, {
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
    const message = data?.error || `Tracking request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

export const fetchDau = async (query = {}) => fetchActiveUsers({ ...query, type: "dau" });
export const fetchWau = async (query = {}) => fetchActiveUsers({ ...query, type: "wau" });
export const fetchMau = async (query = {}) => fetchActiveUsers({ ...query, type: "mau" });
