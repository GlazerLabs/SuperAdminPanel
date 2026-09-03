const TRACKING_START_YMD = "2026-04-01";

function getTrackingBaseUrl() {
  return String(
    process.env.TRACKING_BASE_URL || process.env.NEXT_PUBLIC_TRACKING_BASE_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
}

function getTrackingApiKey() {
  return String(
    process.env.TRACKING_API_KEY || process.env.NEXT_PUBLIC_TRACKING_API_KEY || ""
  ).trim();
}

function emptyResult() {
  return { byDate: new Map(), total: 0, rows: [] };
}

export function normalizeTrackingInstallRows(response) {
  const payload = response?.data ?? response;
  const rows =
    payload?.days ??
    payload?.rows ??
    payload?.data ??
    payload?.points ??
    (Array.isArray(payload) ? payload : []);
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const isoDate = String(
        row?.day ?? row?.date ?? row?.period ?? row?.bucket ?? ""
      ).trim();
      const installs = Number(row?.installs ?? row?.count ?? row?.value ?? 0) || 0;
      if (!isoDate) return null;
      const ymd = isoDate.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
      return { date: ymd, installs };
    })
    .filter(Boolean);
}

export async function fetchTrackingInstallsByDate(startYmd, endYmd) {
  const baseUrl = getTrackingBaseUrl();
  if (!baseUrl || !startYmd || !endYmd) return emptyResult();

  const from = startYmd < TRACKING_START_YMD ? TRACKING_START_YMD : startYmd;
  if (from > endYmd) return emptyResult();

  const apiKey = getTrackingApiKey();
  const url = `${baseUrl}/events/app-installed/date-wise?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(endYmd)}`;
  const headers = { Accept: "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw new Error(json?.error || `Tracking installs failed (${res.status})`);
  }

  const rows = normalizeTrackingInstallRows(json);
  const byDate = new Map();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) || 0) + row.installs);
  }
  const total = [...byDate.values()].reduce((sum, n) => sum + n, 0);
  return { byDate, total, rows };
}

export async function fetchTrackingInstallsSafe(startYmd, endYmd) {
  try {
    return await fetchTrackingInstallsByDate(startYmd, endYmd);
  } catch (error) {
    console.error("Failed to load tracking installs:", error);
    return emptyResult();
  }
}
