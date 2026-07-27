 "use client";

import { useEffect, useMemo, useState } from "react";
import TrafficChartContainer from "@/components/charts/TrafficChartContainer";
// import CountryInstallsBarChart from "@/components/charts/CountryInstallsBarChart";
// import TrafficSourcesPieChart from "@/components/charts/TrafficSourcesPieChart";
import PlaystoreInstallsChart from "@/components/charts/PlaystoreInstallsChart";
import { fetchDashboardUserCounts } from "@/api";

const PERIODS = [
  "Today",
  "Yesterday",
  "Last Week",
  "Last Month",
  "Quarterly",
  "Overall",
  "Custom",
];

const toYmdLocal = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseYmdLocal = (ymd) => {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatShortRangeLabel = (startYmd, endYmd) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const start = parseYmdLocal(startYmd);
  const end = parseYmdLocal(endYmd);
  if (!start || !end) return `${startYmd} – ${endYmd}`;
  const left = `${months[start.getMonth()]} ${start.getDate()}`;
  const right = `${months[end.getMonth()]} ${end.getDate()}`;
  return `${left} – ${right}`;
};

const getDefaultCustomRange = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return { start: toYmdLocal(start), end: toYmdLocal(today) };
};

export default function Home() {
  const [activePeriod, setActivePeriod] = useState("Today");
  const [customStartDate, setCustomStartDate] = useState(() => getDefaultCustomRange().start);
  const [customEndDate, setCustomEndDate] = useState(() => getDefaultCustomRange().end);
  const [kpi, setKpi] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState(null);
  const [totalUsers, setTotalUsers] = useState(null);
  const [newUsers, setNewUsers] = useState(null);
  const [userCountsLoading, setUserCountsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState("idle"); // idle | copied | error
  const [exportStatus, setExportStatus] = useState("idle"); // idle | loading | done | error

  const todayYmd = toYmdLocal(new Date());

  const { analyticsQuery, rangeLabelOverride, countStartIso, countEndIso } = useMemo(() => {
    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const endOfDay = (d) => {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    };
    const today = new Date();

    if (activePeriod === "Today") {
      const ymd = toYmdLocal(today);
      return {
        analyticsQuery: `startDate=${ymd}&endDate=${ymd}`,
        rangeLabelOverride: "Today",
        countStartIso: startOfDay(today).toISOString(),
        countEndIso: endOfDay(today).toISOString(),
      };
    }

    if (activePeriod === "Yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const ymd = toYmdLocal(d);
      return {
        analyticsQuery: `startDate=${ymd}&endDate=${ymd}`,
        rangeLabelOverride: "Yesterday",
        countStartIso: startOfDay(d).toISOString(),
        countEndIso: endOfDay(d).toISOString(),
      };
    }

    if (activePeriod === "Last Week") {
      const daysFromMonday = (today.getDay() + 6) % 7;
      const startOfCurrentWeek = new Date(today);
      startOfCurrentWeek.setDate(today.getDate() - daysFromMonday);
      const end = new Date(startOfCurrentWeek);
      end.setDate(startOfCurrentWeek.getDate() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const startYmd = toYmdLocal(start);
      const endYmd = toYmdLocal(end);
      return {
        analyticsQuery: `startDate=${startYmd}&endDate=${endYmd}`,
        rangeLabelOverride: null,
        countStartIso: startOfDay(start).toISOString(),
        countEndIso: endOfDay(end).toISOString(),
      };
    }

    if (activePeriod === "Quarterly") {
      const start = new Date(today);
      start.setDate(today.getDate() - 89);
      return {
        analyticsQuery: "days=90",
        rangeLabelOverride: null,
        countStartIso: startOfDay(start).toISOString(),
        countEndIso: endOfDay(today).toISOString(),
      };
    }

    if (activePeriod === "Overall") {
      const start = new Date(today);
      start.setFullYear(2025, 0, 1); // Jan 1, 2025 (local time)
      const startYmd = toYmdLocal(start);
      const endYmd = toYmdLocal(today);
      return {
        analyticsQuery: `startDate=${startYmd}&endDate=${endYmd}`,
        rangeLabelOverride: "Overall (01-01-2025 to Today)",
        countStartIso: startOfDay(start).toISOString(),
        countEndIso: endOfDay(today).toISOString(),
      };
    }

    if (activePeriod === "Last Month") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      const startYmd = toYmdLocal(start);
      const endYmd = toYmdLocal(end);
      return {
        analyticsQuery: `startDate=${startYmd}&endDate=${endYmd}`,
        rangeLabelOverride: null,
        countStartIso: startOfDay(start).toISOString(),
        countEndIso: endOfDay(end).toISOString(),
      };
    }

    if (activePeriod === "Custom") {
      let startYmd = customStartDate;
      let endYmd = customEndDate;
      if (startYmd > endYmd) {
        const tmp = startYmd;
        startYmd = endYmd;
        endYmd = tmp;
      }
      const start = parseYmdLocal(startYmd) || today;
      const end = parseYmdLocal(endYmd) || today;
      return {
        analyticsQuery: `startDate=${startYmd}&endDate=${endYmd}`,
        rangeLabelOverride: formatShortRangeLabel(startYmd, endYmd),
        countStartIso: startOfDay(start).toISOString(),
        countEndIso: endOfDay(end).toISOString(),
      };
    }

    return {
      analyticsQuery: "days=7",
      rangeLabelOverride: null,
      countStartIso: startOfDay(today).toISOString(),
      countEndIso: endOfDay(today).toISOString(),
    };
  }, [activePeriod, customStartDate, customEndDate]);

  useEffect(() => {
    let isMounted = true;

    async function loadKpis() {
      try {
        setKpiLoading(true);
        setKpiError(null);

        const res = await fetch(`/api/analytics?${analyticsQuery}`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || `Request failed with status ${res.status}`);
        }

        if (isMounted) {
          setKpi(json);
        }
      } catch (e) {
        console.error("Failed to load dashboard KPIs:", e);
        if (isMounted) setKpiError(e?.message || "Failed to load KPIs");
      } finally {
        if (isMounted) setKpiLoading(false);
      }
    }

    loadKpis();
    return () => {
      isMounted = false;
    };
  }, [analyticsQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadUserCounts() {
      try {
        setUserCountsLoading(true);
        const response = await fetchDashboardUserCounts(countStartIso, countEndIso);
        const row = Array.isArray(response?.data) ? response.data[0] || {} : {};
        const total = Number(row.totalUsers) || 0;
        const periodUsers = Number(row.users) || 0;

        if (isMounted) {
          setTotalUsers(total);
          setNewUsers(periodUsers);
        }
      } catch (e) {
        console.error("Failed to load dashboard user counts:", e);
        if (isMounted) {
          setTotalUsers((prev) => (prev === null ? 0 : prev));
          setNewUsers(0);
        }
      } finally {
        if (isMounted) setUserCountsLoading(false);
      }
    }

    loadUserCounts();
    return () => {
      isMounted = false;
    };
  }, [countStartIso, countEndIso]);

  const formatCompact = (n) => {
    const num = Number(n) || 0;
    if (num < 1000) return `${num}`;
    const thousandsValue = num / 1000;
    const fixed = thousandsValue.toFixed(2);
    const trimmed = fixed.replace(/\.?0+$/, "");
    return `${trimmed} k`;
  };

  const formatMinutes = (seconds) => {
    const totalSeconds = Math.round(Number(seconds) || 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const formatRangeForCopy = (rangeLabel) => {
    // input like: "Mar 11 – Mar 17"
    if (!rangeLabel || typeof rangeLabel !== "string") return "";
    const [left, right] = rangeLabel.split("–").map((s) => s.trim());
    if (!left || !right) return rangeLabel;

    const toOrdinal = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return n;
      const j = num % 10;
      const k = num % 100;
      let suffix = "th";
      if (j === 1 && k !== 11) suffix = "st";
      else if (j === 2 && k !== 12) suffix = "nd";
      else if (j === 3 && k !== 13) suffix = "rd";
      return `${num}${suffix}`;
    };

    const parseSide = (side) => {
      const parts = side.split(/\s+/).filter(Boolean);
      if (parts.length < 2) return null;
      return { month: parts[0], day: parts[1] };
    };

    const a = parseSide(left);
    const b = parseSide(right);
    if (!a || !b) return rangeLabel;

    if (a.month === b.month) {
      return `${toOrdinal(a.day)}-${toOrdinal(b.day)} ${b.month}`;
    }
    return `${toOrdinal(a.day)} ${a.month}-${toOrdinal(b.day)} ${b.month}`;
  };

  const kpis = kpi?.kpis || null;
  const rangeLabel = rangeLabelOverride || kpi?.range?.label || activePeriod;
  const cardsLoading = kpiLoading || userCountsLoading;
  const useAverageDau =
    activePeriod === "Last Week" ||
    activePeriod === "Last Month" ||
    activePeriod === "Quarterly" ||
    (activePeriod === "Custom" && customStartDate !== customEndDate);

  const dauValue = useMemo(() => {
    const chartData = Array.isArray(kpi?.dau?.chartData) ? kpi.dau.chartData : [];
    if (!chartData.length) return null;

    if (useAverageDau) {
      const sum = chartData.reduce((acc, point) => acc + (Number(point?.users) || 0), 0);
      return Math.round(sum / chartData.length);
    }

    const current = Number(kpi?.dau?.current);
    return Number.isFinite(current) ? current : null;
  }, [kpi, useAverageDau]);

  const totalUsersDisplay = totalUsers === null ? "—" : formatCompact(totalUsers);
  const newUsersDisplay = newUsers === null ? "—" : formatCompact(newUsers);
  const dauDisplay = dauValue === null ? "—" : formatCompact(dauValue);

  const buildCopyText = () => {
    const mauDisplay = !kpis ? "—" : formatCompact(kpis.mau);
    const newDownloadsDisplay = !kpis ? "—" : formatCompact(kpis.totalDownloads);
    const newRegistrationsDisplay = newUsers === null ? "—" : formatCompact(newUsers);
    const avgTimeDisplay = !kpis ? "—" : formatMinutes(kpis.avgTimeSpentSeconds);
    const adReqDisplay = !kpis ? "—" : formatCompact(kpis.adRequests);
    const crashDisplay = !kpis ? "—" : `${kpis.crashPercent}%`;

    return [
      `Total Users: ${totalUsersDisplay}`,
      `MAU: ${mauDisplay}`,
      `DAU: ${dauDisplay}`,
      `New Downloads : ${newDownloadsDisplay}`,
      `New Registrations : ${newRegistrationsDisplay}`,
      `Avg Time Spent: ${avgTimeDisplay}`,
      `Ad Requests: ${adReqDisplay}`,
      `Crash % : ${crashDisplay}`,
    ].join("\n");
  };

  const handleCopy = async () => {
    try {
      setCopyStatus("idle");
      const text = buildCopyText();
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch (e) {
      console.error("Copy failed:", e);
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    }
  };

  const csvEscape = (val) => {
    const s = val === undefined || val === null ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const formatSecondsForCsv = (seconds) => {
    const totalSeconds = Math.round(Number(seconds) || 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const getLast15DayRange = () => {
    const toYmdLocal = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const endOfDay = (d) => {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    };
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 14);
    return {
      startYmd: toYmdLocal(start),
      endYmd: toYmdLocal(today),
      countStartIso: startOfDay(start).toISOString(),
      countEndIso: endOfDay(today).toISOString(),
    };
  };

  const handleExport = async () => {
    try {
      setExportStatus("loading");
      const { startYmd, endYmd, countStartIso, countEndIso } = getLast15DayRange();

      const [exportRes, userCountsRes] = await Promise.all([
        fetch("/api/analytics/dashboard-export?days=15"),
        fetchDashboardUserCounts(countStartIso, countEndIso),
      ]);

      const exportJson = await exportRes.json();
      if (!exportRes.ok || !exportJson?.success) {
        throw new Error(exportJson?.error || `Export failed with status ${exportRes.status}`);
      }

      const userRow = Array.isArray(userCountsRes?.data) ? userCountsRes.data[0] || {} : {};
      const summary = {
        ...exportJson.summary,
        totalUsers: Number(userRow.totalUsers) || exportJson.summary?.totalUsers || 0,
        newUsers: Number(userRow.users) || exportJson.summary?.newUsers || 0,
      };
      const daily = Array.isArray(exportJson.daily) ? exportJson.daily : [];

      const avg = (values) => {
        if (!values.length) return 0;
        return values.reduce((sum, n) => sum + n, 0) / values.length;
      };

      const dailyAvg =
        daily.length > 0
          ? {
              newUsers: Math.round(avg(daily.map((row) => row.newUsers))),
              downloads: Math.round(avg(daily.map((row) => row.downloads))),
              dau: Math.round(avg(daily.map((row) => row.dau))),
              crashPercent: Number(avg(daily.map((row) => row.crashPercent)).toFixed(2)),
              avgTimeSpentSeconds: avg(daily.map((row) => row.avgTimeSpentSeconds)),
              adRequests: Math.round(avg(daily.map((row) => row.adRequests))),
              adImpressions: Math.round(avg(daily.map((row) => row.adImpressions))),
            }
          : null;

      const lines = [
        `Dashboard Export - Last 15 Days (${startYmd} to ${endYmd})`,
        "",
        ["Metric", "Value", "Period"].map(csvEscape).join(","),
        ["Total Users", summary.totalUsers, "Lifetime"].map(csvEscape).join(","),
        ["New Users", summary.newUsers, "Last 15 days"].map(csvEscape).join(","),
        ["Total Downloads", summary.totalDownloads, "Last 15 days"].map(csvEscape).join(","),
        ["MAU", summary.mau, "Last 28 days"].map(csvEscape).join(","),
        ["Avg DAU", summary.avgDau, "Last 15 days"].map(csvEscape).join(","),
        ["Crash %", `${summary.crashPercent}%`, "Last 15 days"].map(csvEscape).join(","),
        [
          "Avg Time Spent",
          formatSecondsForCsv(summary.avgTimeSpentSeconds),
          "Last 15 days",
        ].map(csvEscape).join(","),
        ["Ad Requests", summary.adRequests, "Last 15 days"].map(csvEscape).join(","),
        ["Ad Impressions", summary.adImpressions, "Last 15 days"].map(csvEscape).join(","),
        "",
        [
          "Date",
          "New Users",
          "Downloads",
          "DAU",
          "Crash %",
          "Avg Time Spent",
          "Ad Requests",
          "Ad Impressions",
        ].map(csvEscape).join(","),
        ...daily.map((row) =>
          [
            row.date,
            row.newUsers,
            row.downloads,
            row.dau,
            `${row.crashPercent}%`,
            formatSecondsForCsv(row.avgTimeSpentSeconds),
            row.adRequests,
            row.adImpressions,
          ]
            .map(csvEscape)
            .join(",")
        ),
        ...(dailyAvg
          ? [
              [
                "Avg",
                dailyAvg.newUsers,
                dailyAvg.downloads,
                dailyAvg.dau,
                `${dailyAvg.crashPercent}%`,
                formatSecondsForCsv(dailyAvg.avgTimeSpentSeconds),
                dailyAvg.adRequests,
                dailyAvg.adImpressions,
              ]
                .map(csvEscape)
                .join(","),
            ]
          : []),
      ];

      const csv = lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-last-15-days-${endYmd}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus("done");
      window.setTimeout(() => setExportStatus("idle"), 1200);
    } catch (e) {
      console.error("Export failed:", e);
      setExportStatus("error");
      window.setTimeout(() => setExportStatus("idle"), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero + period */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-600">
          Platform health and key metrics at a glance.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setActivePeriod(label)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  label === activePeriod
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}

            {activePeriod === "Custom" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200/80">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  From
                  <input
                    type="date"
                    value={customStartDate}
                    max={customEndDate || todayYmd}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  To
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate}
                    max={todayYmd}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* <button
              type="button"
              onClick={handleExport}
              disabled={exportStatus === "loading"}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Export last 15 days as CSV"
            >
              <svg
                className="h-4 w-4 text-slate-500"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 3.5V11.5M10 11.5L7 8.5M10 11.5L13 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.5 14.5V15.5C4.5 16.0523 4.94772 16.5 5.5 16.5H14.5C15.0523 16.5 15.5 16.0523 15.5 15.5V14.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                {exportStatus === "loading"
                  ? "Exporting…"
                  : exportStatus === "done"
                    ? "Exported"
                    : exportStatus === "error"
                      ? "Export failed"
                      : "Export"}
              </span>
            </button> */}

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50"
              title="Copy stats"
            >
              <svg
                className="h-4 w-4 text-slate-500"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 6.5V5.5C7.5 4.39543 8.39543 3.5 9.5 3.5H14.5C15.6046 3.5 16.5 4.39543 16.5 5.5V12.5C16.5 13.6046 15.6046 14.5 14.5 14.5H13.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M5.5 6.5H10.5C11.6046 6.5 12.5 7.39543 12.5 8.5V15.5C12.5 16.6046 11.6046 17.5 10.5 17.5H5.5C4.39543 17.5 3.5 16.6046 3.5 15.5V8.5C3.5 7.39543 4.39543 6.5 5.5 6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span>
                {copyStatus === "copied"
                  ? "Copied"
                  : copyStatus === "error"
                    ? "Copy failed"
                    : "Copy"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards — one accent (indigo), bold numbers */}
      <section className="mb-8">
        {kpiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {kpiError}
          </div>
        ) : cardsLoading ? (
          <div className="grid gap-5 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
              >
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="mt-4 h-10 w-32 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-slate-200/60 to-transparent animate-[shimmer_1.4s_infinite]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3">
          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Total users
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {totalUsersDisplay}
            </p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              New users
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {newUsersDisplay}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Total downloads
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis ? "—" : formatCompact(kpis.totalDownloads)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              MAU
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis ? "—" : formatCompact(kpis.mau)}
            </p>
            <p className="mt-1 text-sm text-slate-500">Last 28 days</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              DAU
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis ? "—" : dauDisplay}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Crash %
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis ? "—" : `${kpis.crashPercent}%`}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Avg time spent
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis ? "—" : formatMinutes(kpis.avgTimeSpentSeconds)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Ad requests
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis ? "—" : formatCompact(kpis.adRequests)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Ad impressions
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {kpiLoading || !kpis
                ? "—"
                : formatCompact(kpis.adImpressions ?? 0)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
          </div>
        </div>
        )}
      </section>

      {/* Charts — more space, clear sections */}
      <section className="chart-fade-in grid gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Usage & revenue trends
            </h2>
          </div>
          <div className="mt-5 h-[340px] sm:h-[400px]">
            <TrafficChartContainer />
          </div>
        </div>

        {/* <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
            <h2 className="text-xl font-semibold text-slate-900">
              Installs by country
            </h2>
            <div className="mt-5 h-72">
              <CountryInstallsBarChart />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
            <h2 className="text-xl font-semibold text-slate-900">
              Acquisition sources
            </h2>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-64 flex-1 sm:h-72">
                <TrafficSourcesPieChart />
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 sm:flex-col">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-indigo-500" />
                  Search · 45%
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-violet-500" />
                  Browse · 25%
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  Referral · 18%
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Ad campaigns · 12%
                </li>
              </ul>
            </div>
          </div>
        </div> */}
      </section>

      {/* Play Store chart from BigQuery */}
      {/* <section className="mt-8 chart-fade-in">
        <PlaystoreInstallsChart />
      </section> */}
    </main>
  );
}
