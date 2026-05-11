"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchInstallsDateWise } from "@/trackingInstallsApi";

const ANALYTICS_MIN_DATE = "2026-04-01";

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const todayYmd = () => toYmd(new Date());

const clampYmd = (value, min, max) => {
  const v = String(value || "");
  if (!v) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatShortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
};

const normalizeInstallsRows = (response) => {
  const payload = response?.data ?? response;
  const rows = payload?.days ?? payload?.rows ?? payload?.data ?? payload?.points ?? (Array.isArray(payload) ? payload : []);
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const isoDate = String(row?.day ?? row?.date ?? row?.period ?? row?.bucket ?? "").trim();
      const installs = Number(row?.installs ?? row?.count ?? row?.value ?? 0) || 0;
      if (!isoDate) return null;
      return { isoDate, date: formatShortDate(isoDate), installs };
    })
    .filter(Boolean)
    .sort((a, b) => (a.isoDate > b.isoDate ? 1 : a.isoDate < b.isoDate ? -1 : 0));
};

function InstallTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const installs = Number(payload[0]?.value || 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{installs.toLocaleString()} installs</p>
    </div>
  );
}

const ShimmerCard = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 animate-pulse">
    <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
    <div className="h-3 w-24 rounded bg-slate-200" />
    <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
  </div>
);

export default function InstallsPage() {
  const defaultEnd = todayYmd();
  const defaultStart = clampYmd("2026-05-01", ANALYTICS_MIN_DATE, defaultEnd);

  const [fromDate, setFromDate] = useState(defaultStart);
  const [toDate, setToDate] = useState(defaultEnd);
  const [installsData, setInstallsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const effectiveRange = useMemo(() => {
    const max = todayYmd();
    const from = clampYmd(fromDate, ANALYTICS_MIN_DATE, max);
    const to = clampYmd(toDate, ANALYTICS_MIN_DATE, max);
    return from <= to ? { from, to } : { from: to, to: from };
  }, [fromDate, toDate]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchInstallsDateWise({ from: effectiveRange.from, to: effectiveRange.to });
        if (mounted) setInstallsData(normalizeInstallsRows(response));
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load installs");
          setInstallsData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [effectiveRange.from, effectiveRange.to]);

  const summary = useMemo(() => {
    if (!installsData.length) return { current: 0, previous: 0, average: 0, total: 0 };
    const current = installsData[installsData.length - 1]?.installs || 0;
    const previous = installsData[installsData.length - 2]?.installs || 0;
    const total = installsData.reduce((sum, row) => sum + row.installs, 0);
    const average = Math.round(total / installsData.length);
    return { current, previous, average, total };
  }, [installsData]);

  const cards = [
    { label: "Current Installs", value: summary.current.toLocaleString(), accent: "bg-indigo-500/10" },
    { label: "Previous Installs", value: summary.previous.toLocaleString(), accent: "bg-indigo-500/10" },
    { label: "Average Installs", value: summary.average.toLocaleString(), accent: "bg-indigo-500/10" },
    { label: "Total Installs", value: summary.total.toLocaleString(), accent: "bg-indigo-500/10" },
  ];

  const exportCsv = () => {
    const header = "Date,Installs";
    const lines = installsData.map((row) => `${JSON.stringify(row.isoDate)},${row.installs}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `installs-${effectiveRange.from}-to-${effectiveRange.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 ring-1 ring-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Date Range</p>
            <p className="text-xs text-slate-500">Pick a range between Apr 1, 2026 and today.</p>
          </div>

          <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            {effectiveRange.from} {"->"} {effectiveRange.to}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            From
            <input type="date" min={ANALYTICS_MIN_DATE} max={todayYmd()} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700" />
          </label>

          <label className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            To
            <input type="date" min={ANALYTICS_MIN_DATE} max={todayYmd()} value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700" />
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => <ShimmerCard key={idx} />)
          : cards.map((card) => (
              <div key={card.label} className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${card.accent}`} />
                <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{card.value}</p>
              </div>
            ))}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-md shadow-indigo-100/30 ring-1 ring-indigo-100/70">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Install Data</h3>
            <p className="text-sm text-slate-600">Live installs from tracking backend for selected date range.</p>
          </div>
        </div>

        <div className="h-[300px]">
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm font-medium text-red-500">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={installsData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="installAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis domain={[(dataMin) => Math.max(0, dataMin - 40), (dataMax) => dataMax + 40]} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<InstallTooltip />} />
                <Area type="monotone" dataKey="installs" name="Installs" stroke="#6366f1" strokeWidth={2.5} fill="url(#installAreaGradient)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4f46e5" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-indigo-100/60">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-indigo-900">Daily Installs</h4>
          <button type="button" onClick={exportCsv} disabled={loading || installsData.length === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-indigo-100 bg-[#f5f7ff]">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-indigo-900">Date</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-indigo-900">Installs</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`shimmer-${idx}`} className="border-b border-slate-100 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    </tr>
                  ))
                : installsData.map((row) => (
                    <tr key={row.isoDate} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.isoDate}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.installs.toLocaleString()}</td>
                    </tr>
                  ))}

              {!loading && !error && installsData.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan={2}>
                    No installs data for selected range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
