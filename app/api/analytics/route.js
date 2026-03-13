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

    if (startDate && endDate) {
      // Absolute range: YYYY-MM-DD
      dateRanges = [{ startDate, endDate }];
    } else if (days) {
      // Relative range: N days ago until today
      dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];
    } else {
      // Default: last 7 days
      dateRanges = [{ startDate: "7daysAgo", endDate: "today" }];
    }

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "totalRevenue" }],
    });

    const chartData =
      response.rows
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

    return NextResponse.json(
      {
        success: true,
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

