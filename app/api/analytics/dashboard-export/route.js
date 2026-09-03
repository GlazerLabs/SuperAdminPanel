import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { fetchTrackingInstallsSafe } from "@/lib/trackingInstalls";

function toAdMobDate(ymd) {
  const [year, month, day] = String(ymd || "")
    .split("-")
    .map((v) => Number(v));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function normalizeAdMobAccountId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.startsWith("accounts/") ? value.replace(/^accounts\//, "") : value;
}

function parseAdMobRowsFromText(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    const arr = JSON.parse(text);
    return Array.isArray(arr) ? arr : [];
  }
  if (text.startsWith("{")) {
    return [JSON.parse(text)];
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function adMobDateToYmd(dateValue) {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{8}$/.test(trimmed)) {
      return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    }
    return trimmed;
  }
  const year = Number(dateValue.year);
  const month = Number(dateValue.month);
  const day = Number(dateValue.day);
  if (!year || !month || !day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function getAdMobAccessToken() {
  const clientId = String(process.env.ADMOB_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.ADMOB_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.ADMOB_REFRESH_TOKEN || "").trim();
  const publisherId = normalizeAdMobAccountId(process.env.ADMOB_PUBLISHER_ID);

  if (!clientId || !clientSecret || !refreshToken || !publisherId) {
    throw new Error(
      "Missing AdMob credentials. Set ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET, ADMOB_REFRESH_TOKEN, ADMOB_PUBLISHER_ID"
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(
      `AdMob token request failed with status ${tokenRes.status}: ${tokenText.slice(0, 300)}`
    );
  }
  const tokenJson = JSON.parse(tokenText);
  const accessToken = tokenJson?.access_token;
  if (!accessToken) {
    throw new Error("AdMob token response did not include access_token");
  }

  return { accessToken, publisherId };
}

async function getAdMobDaily({ startYmd, endYmd }) {
  const startDate = toAdMobDate(startYmd);
  const endDate = toAdMobDate(endYmd);
  if (!startDate || !endDate) return new Map();

  const appId = String(process.env.ADMOB_APP_ID || "").trim();
  const { accessToken, publisherId } = await getAdMobAccessToken();

  const reportSpec = {
    date_range: { start_date: startDate, end_date: endDate },
    metrics: ["AD_REQUESTS", "IMPRESSIONS"],
    dimensions: ["DATE"],
    sort_conditions: [{ dimension: "DATE", order: "ASCENDING" }],
    localization_settings: {
      currency_code: "USD",
      language_code: "en-US",
    },
  };

  if (appId) {
    reportSpec.dimension_filters = {
      filters: [
        {
          dimension: "APP",
          matchesAny: {
            values: [appId],
          },
        },
      ],
    };
  }

  const reportRes = await fetch(
    `https://admob.googleapis.com/v1/accounts/${publisherId}/networkReport:generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ report_spec: reportSpec }),
    }
  );

  const reportText = await reportRes.text();
  if (!reportRes.ok) {
    throw new Error(
      `AdMob report request failed with status ${reportRes.status}: ${reportText.slice(0, 300)}`
    );
  }

  const chunks = parseAdMobRowsFromText(reportText);
  const byDate = new Map();

  for (const item of chunks) {
    const row = item?.row;
    if (!row) continue;
    const ymd = adMobDateToYmd(row.dimensionValues?.DATE?.value);
    if (!ymd) continue;
    byDate.set(ymd, {
      adRequests: Number(row.metricValues?.AD_REQUESTS?.integerValue || 0),
      adImpressions: Number(row.metricValues?.IMPRESSIONS?.integerValue || 0),
    });
  }

  return byDate;
}

function gaDateToYmd(gaDate) {
  if (!gaDate || gaDate.length !== 8) return gaDate;
  return `${gaDate.slice(0, 4)}-${gaDate.slice(4, 6)}-${gaDate.slice(6, 8)}`;
}

function toYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysYmd(ymd, daysToAdd) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + daysToAdd);
  return toYmd(d);
}

async function runReportWithLifetimeFallback(analyticsDataClient, request) {
  try {
    const [res] = await analyticsDataClient.runReport(request);
    return res;
  } catch (e) {
    const msg = String(e?.message || "");
    const m = msg.match(/must be greater than (\d{4}-\d{2}-\d{2})/);
    if (!m) throw e;
    const retryStart = addDaysYmd(m[1], 1);
    const retryRequest = {
      ...request,
      dateRanges: [{ startDate: retryStart, endDate: "today" }],
    };
    const [retryRes] = await analyticsDataClient.runReport(retryRequest);
    return retryRes;
  }
}

async function runGaDailyEventReport(analyticsDataClient, propertyId, dateRanges, eventName) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges,
    dimensions: [{ name: "date" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: {
          matchType: "EXACT",
          value: eventName,
        },
      },
    },
  });

  const byDate = new Map();
  for (const row of response.rows || []) {
    const ymd = gaDateToYmd(row.dimensionValues?.[0]?.value);
    if (!ymd) continue;
    byDate.set(ymd, Number(row.metricValues?.[0]?.value) || 0);
  }
  return byDate;
}

export async function GET(req) {
  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    const propertyId = process.env.GA4_PROPERTY_ID;
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get("days")) || 15, 1), 90);

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (days - 1));
    const resolvedStartYmd = toYmd(start);
    const resolvedEndYmd = toYmd(today);
    const dateRanges = [{ startDate: resolvedStartYmd, endDate: resolvedEndYmd }];

    const [usageResponse, trackingInstalls, crashesByDate, adMobByDate, mau28Response, lifetimeUsersResponse] =
      await Promise.all([
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "newUsers" },
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "userEngagementDuration" },
          ],
        }),
        fetchTrackingInstallsSafe(resolvedStartYmd, resolvedEndYmd),
        runGaDailyEventReport(analyticsDataClient, propertyId, dateRanges, "app_exception"),
        getAdMobDaily({ startYmd: resolvedStartYmd, endYmd: resolvedEndYmd }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
          metrics: [{ name: "activeUsers" }],
        }),
        runReportWithLifetimeFallback(analyticsDataClient, {
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: "2000-01-01", endDate: "today" }],
          metrics: [{ name: "totalUsers" }],
        }),
      ]);

    const [usageRows] = usageResponse;
    const [mau28Rows] = mau28Response;

    const usageByDate = new Map();
    for (const row of usageRows.rows || []) {
      const ymd = gaDateToYmd(row.dimensionValues?.[0]?.value);
      if (!ymd) continue;
      usageByDate.set(ymd, {
        newUsers: Number(row.metricValues?.[0]?.value) || 0,
        dau: Number(row.metricValues?.[1]?.value) || 0,
        sessions: Number(row.metricValues?.[2]?.value) || 0,
        engagementSeconds: Number(row.metricValues?.[3]?.value) || 0,
      });
    }

    const allDates = [];
    const cursor = new Date(`${resolvedStartYmd}T00:00:00`);
    const endDate = new Date(`${resolvedEndYmd}T00:00:00`);
    while (cursor <= endDate) {
      allDates.push(toYmd(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const daily = allDates.map((date) => {
      const usage = usageByDate.get(date) || {
        newUsers: 0,
        dau: 0,
        sessions: 0,
        engagementSeconds: 0,
      };
      const downloads = trackingInstalls.byDate.get(date) || 0;
      const crashEvents = crashesByDate.get(date) || 0;
      const adMob = adMobByDate.get(date) || { adRequests: 0, adImpressions: 0 };
      const crashPercent =
        usage.sessions > 0 ? Number(((crashEvents / usage.sessions) * 100).toFixed(2)) : 0;
      const avgTimeSpentSeconds =
        usage.dau > 0 ? usage.engagementSeconds / usage.dau : 0;

      return {
        date,
        newUsers: usage.newUsers,
        downloads,
        dau: usage.dau,
        crashPercent,
        avgTimeSpentSeconds,
        adRequests: adMob.adRequests,
        adImpressions: adMob.adImpressions,
      };
    });

    const totalNewUsers = daily.reduce((sum, row) => sum + row.newUsers, 0);
    const totalDownloads = daily.reduce((sum, row) => sum + row.downloads, 0);
    const totalAdRequests = daily.reduce((sum, row) => sum + row.adRequests, 0);
    const totalAdImpressions = daily.reduce((sum, row) => sum + row.adImpressions, 0);
    const totalDau = daily.reduce((sum, row) => sum + row.dau, 0);
    const totalSessions = daily.reduce((sum, row) => {
      const usage = usageByDate.get(row.date);
      return sum + (usage?.sessions || 0);
    }, 0);
    const totalCrashEvents = [...crashesByDate.values()].reduce((sum, n) => sum + n, 0);

    const summary = {
      totalUsers: Number(lifetimeUsersResponse.rows?.[0]?.metricValues?.[0]?.value) || 0,
      newUsers: totalNewUsers,
      totalDownloads,
      mau: Number(mau28Rows.rows?.[0]?.metricValues?.[0]?.value) || 0,
      avgDau: daily.length ? Math.round(totalDau / daily.length) : 0,
      crashPercent:
        totalSessions > 0
          ? Number(((totalCrashEvents / totalSessions) * 100).toFixed(2))
          : 0,
      avgTimeSpentSeconds:
        daily.length > 0
          ? daily.reduce((sum, row) => sum + row.avgTimeSpentSeconds, 0) /
            daily.length
          : 0,
      adRequests: totalAdRequests,
      adImpressions: totalAdImpressions,
    };

    return NextResponse.json(
      {
        success: true,
        range: {
          startDate: resolvedStartYmd,
          endDate: resolvedEndYmd,
          days,
        },
        summary,
        daily,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error exporting dashboard analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
