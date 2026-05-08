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
import { fetchDau, fetchMau, fetchWau } from "@/trackingActiveUsersApi";

const TYPE_META = {
  dau: { label: "DAU", color: "#6366f1", accent: "bg-indigo-500/10" },
  wau: { label: "WAU", color: "#0ea5e9", accent: "bg-sky-500/10" },
  mau: { label: "MAU", color: "#8b5cf6", accent: "bg-violet-500/10" },
};

const fetcherByType = {
  dau: fetchDau,
  wau: fetchWau,
  mau: fetchMau,
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

const getDefaultRangeByType = (type) => {
  const toDate = new Date();
  const fromDate = new Date();

  if (type === "mau") {
    fromDate.setDate(1);
    fromDate.setMonth(fromDate.getMonth() - 6);
  } else if (type === "wau") {
    fromDate.setDate(toDate.getDate() - 55);
  } else {
    fromDate.setDate(toDate.getDate() - 6);
  }

  const max = todayYmd();
  const from = clampYmd(toYmd(fromDate), ANALYTICS_MIN_DATE, max);
  const to = clampYmd(toYmd(toDate), ANALYTICS_MIN_DATE, max);

  return from <= to ? { from, to } : { from: to, to: from };
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ordinal = (n) => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

const parseISOWeekStart = (year, week) => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  return new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
};

const parseDateLike = (value) => {
  const str = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}$/.test(str)) {
    const month = Number(str.slice(5, 7));
    if (month >= 1 && month <= 12) {
      const d = new Date(`${str}-01T00:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const weekMatch = str.match(/^(\d{4})-W?(\d{1,2})$/);
  if (weekMatch) {
    const year = Number(weekMatch[1]);
    const week = Number(weekMatch[2]);
    if (week >= 1 && week <= 53) {
      const d = parseISOWeekStart(year, week);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  return null;
};

const formatDauLabel = (date) => `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;

const formatMauLabel = (raw, date) => {
  if (/^\d{4}-\d{2}$/.test(String(raw || ""))) {
    return MONTHS_SHORT[date.getMonth()];
  }
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

const formatWauLabel = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    return `${ordinal(startDate.getDate())}-${ordinal(endDate.getDate())} ${MONTHS_SHORT[startDate.getMonth()]}`;
  }

  return `${ordinal(startDate.getDate())} ${MONTHS_SHORT[startDate.getMonth()]}-${ordinal(endDate.getDate())} ${MONTHS_SHORT[endDate.getMonth()]}`;
};

const readUserCount = (row) => {
  return toNumber(
    row?.activeUsers ??
      row?.users ??
      row?.count ??
      row?.value ??
      row?.dau ??
      row?.wau ??
      row?.mau
  );
};

const resolveBucketRaw = (row, index) => {
  return (
    row?.period ??
    row?.date ??
    row?.bucket ??
    row?.week ??
    row?.month ??
    row?.label ??
    `Point ${index + 1}`
  );
};

const formatBucketByType = (bucketRaw, type, index) => {
  const date = parseDateLike(bucketRaw);
  if (!date) return String(bucketRaw || `Point ${index + 1}`);

  if (type === "mau") return formatMauLabel(bucketRaw, date);
  if (type === "wau") return formatWauLabel(date);
  return formatDauLabel(date);
};

const normalizeRows = (response, type) => {
  const payload = response?.data ?? response;
  const rows = payload?.rows ?? payload?.data ?? payload?.buckets ?? (Array.isArray(payload) ? payload : []);

  if (!Array.isArray(rows)) return [];

  const withIndex = rows.map((row, index) => {
    const bucketRaw = resolveBucketRaw(row, index);
    const parsed = parseDateLike(bucketRaw);
    return { row, index, bucketRaw, parsed };
  });

  withIndex.sort((a, b) => {
    if (a.parsed && b.parsed) return a.parsed.getTime() - b.parsed.getTime();
    return a.index - b.index;
  });

  return withIndex.map(({ row, index, bucketRaw }) => ({
    bucketRaw: String(bucketRaw),
    bucketLabel: formatBucketByType(bucketRaw, type, index),
    users: readUserCount(row),
    raw: row,
  }));
};

const ShimmerCard = ({ accent }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 animate-pulse">
    <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${accent}`} />
    <div className="h-3 w-24 rounded bg-slate-200" />
    <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
  </div>
);

export default function ActiveUsersTypePage({ type = "dau" }) {
  const safeType = TYPE_META[type] ? type : "dau";
  const meta = TYPE_META[safeType];
  const loadUsers = fetcherByType[safeType];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(ANALYTICS_MIN_DATE);
  const [toDate, setToDate] = useState(todayYmd());

  useEffect(() => {
    const next = getDefaultRangeByType(safeType);
    setFromDate(next.from);
    setToDate(next.to);
  }, [safeType]);

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
        const response = await loadUsers({ from: effectiveRange.from, to: effectiveRange.to });
        const parsedRows = normalizeRows(response, safeType);
        if (mounted) setRows(parsedRows);
      } catch (err) {
        if (mounted) {
          setError(err?.message || `Failed to fetch ${meta.label}`);
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [loadUsers, meta.label, safeType, effectiveRange.from, effectiveRange.to]);

  const summary = useMemo(() => {
    if (!rows.length) {
      return { current: 0, previous: 0, average: 0, total: 0 };
    }

    const current = rows[rows.length - 1]?.users || 0;
    const previous = rows[rows.length - 2]?.users || 0;
    const total = rows.reduce((sum, row) => sum + row.users, 0);
    const average = Math.round(total / rows.length);

    return { current, previous, average, total };
  }, [rows]);

  const cards = [
    { label: `Current ${meta.label}`, value: summary.current.toLocaleString() },
    { label: `Previous ${meta.label}`, value: summary.previous.toLocaleString() },
    { label: `Average ${meta.label}`, value: summary.average.toLocaleString() },
    { label: `Total ${meta.label}`, value: summary.total.toLocaleString() },
  ];

  const exportCsv = () => {
    const header = `Bucket,${meta.label}`;
    const lines = rows.map((row) => `${JSON.stringify(row.bucketLabel)},${row.users}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeType}-${effectiveRange.from}-to-${effectiveRange.to}.csv`;
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
            <input
              type="date"
              min={ANALYTICS_MIN_DATE}
              max={todayYmd()}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700"
            />
          </label>

          <label className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            To
            <input
              type="date"
              min={ANALYTICS_MIN_DATE}
              max={todayYmd()}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => <ShimmerCard key={idx} accent={meta.accent} />)
          : cards.map((card) => (
              <div
                key={card.label}
                className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
              >
                <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${meta.accent}`} />
                <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{card.value}</p>
              </div>
            ))}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-md shadow-indigo-100/30 ring-1 ring-indigo-100/70">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{meta.label} Trend</h3>
            <p className="text-sm text-slate-600">Live data from tracking backend.</p>
          </div>
        </div>

        <div className="h-[320px]">
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm font-medium text-red-500">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id={`${safeType}WaveFill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={meta.color} stopOpacity={0.04} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" />
                <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />

                <Area
                  type="natural"
                  dataKey="users"
                  stroke={meta.color}
                  fill={`url(#${safeType}WaveFill)`}
                  strokeWidth={3}
                  dot={{ r: 4, fill: meta.color, stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                  name={meta.label}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-indigo-100/60">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-indigo-900">{meta.label} Buckets</h4>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || rows.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-indigo-100 bg-[#f5f7ff]">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-indigo-900">Bucket</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-indigo-900">{meta.label}</th>
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
                : rows.map((row) => (
                    <tr key={`${row.bucketRaw}-${row.users}`} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.bucketLabel}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.users.toLocaleString()}</td>
                    </tr>
                  ))}

              {!loading && !error && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan={2}>
                    No data returned.
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
