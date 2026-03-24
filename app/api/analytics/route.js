import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

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

  // AdMob can return either newline-delimited JSON objects or a JSON array/object.
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

async function getAdMobTotals({ startYmd, endYmd }) {
  const clientId = String(process.env.ADMOB_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.ADMOB_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.ADMOB_REFRESH_TOKEN || "").trim();
  const publisherId = normalizeAdMobAccountId(process.env.ADMOB_PUBLISHER_ID);
  const appId = String(process.env.ADMOB_APP_ID || "").trim();

  if (!clientId || !clientSecret || !refreshToken || !publisherId) {
    throw new Error(
      "Missing AdMob credentials. Set ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET, ADMOB_REFRESH_TOKEN, ADMOB_PUBLISHER_ID"
    );
  }

  const startDate = toAdMobDate(startYmd);
  const endDate = toAdMobDate(endYmd);
  if (!startDate || !endDate) return null;

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
  let adRequests = 0;
  let adImpressions = 0;

  for (const item of chunks) {
    const row = item?.row;
    if (!row) continue;
    adRequests += Number(row.metricValues?.AD_REQUESTS?.integerValue || 0);
    adImpressions += Number(row.metricValues?.IMPRESSIONS?.integerValue || 0);
  }

  return { adRequests, adImpressions };
}

function formatGaDate(gaDate) {
  if (!gaDate || gaDate.length !== 8) return gaDate;

  const year = gaDate.slice(0, 4);
  const month = gaDate.slice(4, 6);
  const day = gaDate.slice(6, 8);

  const date = new Date(`${year}-${month}-${day}`);
  if (Number.isNaN(date.getTime())) return gaDate;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = date.getDate();
  const m = months[date.getMonth()];

  const j = d % 10;
  const k = d % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  else if (j === 2 && k !== 12) suffix = "nd";
  else if (j === 3 && k !== 13) suffix = "rd";

  return `${d}${suffix} ${m}`;
}

function toYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatRangeLabel(startYmd, endYmd) {
  const start = new Date(`${startYmd}T00:00:00`);
  const end = new Date(`${endYmd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startYmd} – ${endYmd}`;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = `${months[start.getMonth()]} ${start.getDate()}`;
  const e = `${months[end.getMonth()]} ${end.getDate()}`;
  return `${s} – ${e}`;
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
    // Example:
    // "3 INVALID_ARGUMENT: start_date = 2000-01-01 must be greater than 2015-08-13 and less than 3000-01-01."
    const m = msg.match(/must be greater than (\d{4}-\d{2}-\d{2})/);
    if (!m) throw e;
    const minYmdExclusive = m[1];
    const retryStart = addDaysYmd(minYmdExclusive, 1);
    const retryRequest = {
      ...request,
      dateRanges: [{ startDate: retryStart, endDate: "today" }],
    };
    const [retryRes] = await analyticsDataClient.runReport(retryRequest);
    return retryRes;
  }
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const days = searchParams.get("days");

    let dateRanges;
    let resolvedStartYmd;
    let resolvedEndYmd;

    if (startDate && endDate) {
      // Absolute range: YYYY-MM-DD
      dateRanges = [{ startDate, endDate }];
      resolvedStartYmd = startDate;
      resolvedEndYmd = endDate;
    } else if (days) {
      // Relative range: N days ago until today
      dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - (Number(days) - 1));
      resolvedStartYmd = toYmd(start);
      resolvedEndYmd = toYmd(today);
    } else {
      // Default: last 7 days
      dateRanges = [{ startDate: "7daysAgo", endDate: "today" }];
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 6);
      resolvedStartYmd = toYmd(start);
      resolvedEndYmd = toYmd(today);
    }

    const lifetimeDateRanges = [{ startDate: "2000-01-01", endDate: "today" }];
    const mau28DateRanges = [{ startDate: "28daysAgo", endDate: "today" }];

    // KPI totals for the selected period
    const [kpiTotalsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "userEngagementDuration" },
      ],
    });

    const kpiTotalsRow = kpiTotalsResponse.rows?.[0];
    const totalUsers = Number(kpiTotalsRow?.metricValues?.[0]?.value) || 0;
    const newUsers = Number(kpiTotalsRow?.metricValues?.[1]?.value) || 0;
    const activeUsers = Number(kpiTotalsRow?.metricValues?.[2]?.value) || 0;
    const sessions = Number(kpiTotalsRow?.metricValues?.[3]?.value) || 0;
    const engagementSeconds =
      Number(kpiTotalsRow?.metricValues?.[4]?.value) || 0;
    const avgEngagementSeconds = activeUsers > 0 ? engagementSeconds / activeUsers : 0;

    // Total downloads (GA4 best proxy = first_open event count)
    const [downloadsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: "first_open",
          },
        },
      },
    });
    const downloads = Number(downloadsResponse.rows?.[0]?.metricValues?.[0]?.value) || 0;

    // Crash % (proxy = app_exception events / sessions)
    const [crashResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: "app_exception",
          },
        },
      },
    });
    const crashEvents = Number(crashResponse.rows?.[0]?.metricValues?.[0]?.value) || 0;
    const crashPercent = sessions > 0 ? (crashEvents / sessions) * 100 : 0;

    // Ad requests/impressions from AdMob API (no GA4 fallback).
    const adMobTotals = await getAdMobTotals({
      startYmd: resolvedStartYmd,
      endYmd: resolvedEndYmd,
    });
    const adRequests = adMobTotals.adRequests;
    const adImpressions = adMobTotals.adImpressions;

    // MAU is always last 28 days (independent of selected filter).
    const [mau28Response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: mau28DateRanges,
      metrics: [{ name: "activeUsers" }],
    });
    const mau28 = Number(mau28Response.rows?.[0]?.metricValues?.[0]?.value) || 0;

    // Lifetime totals (for card footers / copy).
    const lifetimeUsersResponse = await runReportWithLifetimeFallback(
      analyticsDataClient,
      {
      property: `properties/${propertyId}`,
      dateRanges: lifetimeDateRanges,
      metrics: [{ name: "totalUsers" }],
      }
    );
    const lifetimeTotalUsers =
      Number(lifetimeUsersResponse.rows?.[0]?.metricValues?.[0]?.value) || 0;

    const lifetimeDownloadsResponse = await runReportWithLifetimeFallback(
      analyticsDataClient,
      {
      property: `properties/${propertyId}`,
      dateRanges: lifetimeDateRanges,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: "first_open",
          },
        },
      },
      }
    );
    const lifetimeTotalDownloads =
      Number(lifetimeDownloadsResponse.rows?.[0]?.metricValues?.[0]?.value) || 0;

    // Usage & revenue time series
    const [usageResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "totalRevenue" }],
    });

    const chartData =
      usageResponse.rows
        ?.map((row) => ({
          rawDate: row.dimensionValues[0].value,
          users: parseInt(row.metricValues[0].value) || 0,
          revenue: parseFloat(row.metricValues[1].value) || 0,
        }))
        .sort((a, b) => (a.rawDate > b.rawDate ? 1 : a.rawDate < b.rawDate ? -1 : 0))
        .map((row) => ({
          date: formatGaDate(row.rawDate),
          users: row.users,
          revenue: row.revenue,
        })) || [];

    const currentDau = chartData[chartData.length - 1]?.users || 0;
    const previousDau = chartData[chartData.length - 2]?.users || 0;
    const dauChange =
      previousDau > 0
        ? (((currentDau - previousDau) / previousDau) * 100).toFixed(1)
        : 0;

    const currentRevenue = chartData[chartData.length - 1]?.revenue || 0;
    const previousRevenue = chartData[chartData.length - 2]?.revenue || 0;
    const revenueChange =
      previousRevenue > 0
        ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
        : 0;

    // Installs time series (best GA4 proxy = first_open event count)
    const [installsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: "first_open",
          },
        },
      },
    });

    const installsChartData =
      installsResponse.rows
        ?.map((row) => ({
          rawDate: row.dimensionValues[0].value,
          installs: parseInt(row.metricValues[0].value) || 0,
        }))
        .sort((a, b) => (a.rawDate > b.rawDate ? 1 : a.rawDate < b.rawDate ? -1 : 0))
        .map((row) => ({
          date: formatGaDate(row.rawDate),
          installs: row.installs,
        })) || [];

    const totalInstalls = installsChartData.reduce(
      (sum, row) => sum + (row.installs || 0),
      0
    );

    return NextResponse.json(
      {
        success: true,
        range: {
          startDate: resolvedStartYmd,
          endDate: resolvedEndYmd,
          label: formatRangeLabel(resolvedStartYmd, resolvedEndYmd),
        },
        lifetime: {
          totalUsers: lifetimeTotalUsers,
          totalDownloads: lifetimeTotalDownloads,
        },
        kpis: {
          totalUsers,
          newUsers,
          totalDownloads: downloads,
          mau: mau28,
          crashPercent: Number(crashPercent.toFixed(2)),
          avgTimeSpentSeconds: avgEngagementSeconds,
          adRequests,
          adImpressions,
        },
        dau: {
          current: currentDau,
          percentageChange: `${dauChange > 0 ? "+" : ""}${dauChange}`,
          chartData,
        },
        revenue: {
          current: currentRevenue.toFixed(2),
          percentageChange: `${revenueChange > 0 ? "+" : ""}${revenueChange}`,
          chartData,
        },
        installs: {
          total: totalInstalls,
          latest: installsChartData[installsChartData.length - 1]?.installs || 0,
          chartData: installsChartData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details:
          "Check GA4 settings and AdMob env vars (ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET, ADMOB_REFRESH_TOKEN, ADMOB_PUBLISHER_ID)",
      },
      { status: 500 }
    );
  }
}

