"use client";

import { useEffect, useState } from "react";
import TrafficChart from "./TrafficChart";

function getDefaultRange() {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - 6); // last 7 days including today

  const toInput = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return { start: toInput(start), end: toInput(end) };
}

export default function TrafficChartContainer() {
  const defaultRange = getDefaultRange();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchAnalytics() {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        if (startDate && endDate) {
          params.set("startDate", startDate);
          params.set("endDate", endDate);
        }

        const query = params.toString();
        const res = await fetch(`/api/analytics${query ? `?${query}` : ""}`);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const json = await res.json();
        if (!json?.success) {
          throw new Error(json?.error || "Failed to load analytics");
        }

        // Map API response to chart format expected by TrafficChart
        const chartRows = json?.dau?.chartData || [];
        const chartData = chartRows.map((row) => ({
          date: row.date,
          activeUsers: row.users, // GA activeUsers
          totalRevenue: row.revenue, // GA totalRevenue
        }));

        if (isMounted) {
          setData(chartData);
        }
      } catch (err) {
        console.error("Error loading analytics for TrafficChart:", err);
        if (isMounted) {
          setError(err.message || "Failed to load analytics");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  const rangeLabel =
    data && data.length
      ? `${data[0].date} – ${data[data.length - 1].date}`
      : "Last 7 days";

  const content =
    loading && !data ? (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading analytics…
      </div>
    ) : error ? (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm">
        <span className="font-medium text-slate-900">
          Unable to load analytics
        </span>
        <span className="text-slate-500">{error}</span>
      </div>
    ) : (
      <TrafficChart data={data} />
    );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">Date range</span>
          <span className="text-slate-500">{rangeLabel}</span>
        </div>
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <span>Last 7 days</span>
            <svg
              className="h-3 w-3 text-slate-500"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 8L10 13L15 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {pickerOpen && (
            <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Select custom range
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-500">From</span>
                  <input
                    type="date"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-500">To</span>
                  <input
                    type="date"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    const defaults = getDefaultRange();
                    setStartDate(defaults.start);
                    setEndDate(defaults.end);
                  }}
                >
                  Reset to last 7 days
                </button>
                <button
                  type="button"
                  className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-500"
                  onClick={() => setPickerOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  );
}

