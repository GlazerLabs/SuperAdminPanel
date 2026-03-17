import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

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

    // KPI totals for the selected period
    const [kpiTotalsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      metrics: [
        { name: "totalUsers" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "userEngagementDuration" },
      ],
    });

    const kpiTotalsRow = kpiTotalsResponse.rows?.[0];
    const totalUsers = Number(kpiTotalsRow?.metricValues?.[0]?.value) || 0;
    const activeUsers = Number(kpiTotalsRow?.metricValues?.[1]?.value) || 0;
    const sessions = Number(kpiTotalsRow?.metricValues?.[2]?.value) || 0;
    const engagementSeconds =
      Number(kpiTotalsRow?.metricValues?.[3]?.value) || 0;
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

    // Ad requests (common events: ad_request / ad_impression).
    // We query them separately to avoid filter-shape incompatibilities.
    const getEventCount = async (eventName) => {
      try {
        const [res] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              stringFilter: { matchType: "EXACT", value: eventName },
            },
          },
        });
        return Number(res.rows?.[0]?.metricValues?.[0]?.value) || 0;
      } catch (e) {
        return 0;
      }
    };

    const [adRequestEvents, adImpressionEvents] = await Promise.all([
      getEventCount("ad_request"),
      getEventCount("ad_impression"),
    ]);
    const adRequests = adRequestEvents + adImpressionEvents;

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
        kpis: {
          totalUsers,
          totalDownloads: downloads,
          mau: activeUsers,
          crashPercent: Number(crashPercent.toFixed(2)),
          avgTimeSpentSeconds: avgEngagementSeconds,
          adRequests,
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
        details: "Check if GA4_PROPERTY_ID is correct and API is enabled",
      },
      { status: 500 }
    );
  }
}

