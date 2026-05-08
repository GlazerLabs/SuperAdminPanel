"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchTrackingEventNames } from "@/trackingEventsApi";
import { fetchActiveUsers } from "@/trackingActiveUsersApi";
import { fetchTrackingFunnel } from "@/trackingFunnelApi";

const ANALYTICS_MIN_DATE = "2026-04-01";
const METRIC_OPTIONS = [
  { label: "Omit type (GET /active-users)", value: "" },
  { label: "DAU", value: "dau" },
  { label: "WAU", value: "wau" },
  { label: "MAU", value: "mau" },
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ShimmerCard = ({ accent = "bg-indigo-500/10" }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 animate-pulse">
    <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${accent}`} />
    <div className="h-3 w-24 rounded bg-slate-200" />
    <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
  </div>
);

const toYmd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayYmd = () => toYmd(new Date());

const clampYmd = (value, min, max) => {
  const v = String(value || "");
  if (!v) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

const getDefaultRange = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 13);
  return { from: toYmd(fromDate), to: toYmd(toDate) };
};

const formatEventName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const formatShortDate = (value = "") => {
  const v = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
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
    const d = parseISOWeekStart(Number(weekMatch[1]), Number(weekMatch[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatWauLabel = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) return `${ordinal(startDate.getDate())}-${ordinal(endDate.getDate())} ${MONTHS_SHORT[startDate.getMonth()]}`;
  return `${ordinal(startDate.getDate())} ${MONTHS_SHORT[startDate.getMonth()]}-${ordinal(endDate.getDate())} ${MONTHS_SHORT[endDate.getMonth()]}`;
};

const formatBucketForMetric = (raw, metricKey) => {
  const date = parseDateLike(raw);
  if (!date) return String(raw || "-");
  if (metricKey === "mau") return MONTHS_SHORT[date.getMonth()];
  if (metricKey === "wau") return formatWauLabel(date);
  return formatShortDate(raw);
};

const normalizeEventNames = (response) => {
  const payload = response?.data ?? response;
  const rows = Array.isArray(payload?.eventNames)
    ? payload.eventNames
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.events)
        ? payload.events
        : Array.isArray(payload)
          ? payload
          : [];

  const unique = new Map();
  rows.forEach((row) => {
    const raw = typeof row === "string" ? row : row?.eventName || row?.name || row?.value;
    const value = String(raw || "").trim();
    if (!value || unique.has(value)) return;
    unique.set(value, { value, label: formatEventName(value) });
  });
  return Array.from(unique.values());
};

const normalizeActiveRows = (response) => {
  const root = response && typeof response === "object" ? response : {};
  const rows = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.rows)
      ? root.rows
      : Array.isArray(root?.data?.data)
        ? root.data.data
        : Array.isArray(root?.data?.rows)
          ? root.data.rows
          : [];

  return rows
    .map((row) => ({ period: String(row?.period || row?.date || ""), users: Number(row?.activeUsers ?? row?.users ?? row?.count ?? 0) || 0 }))
    .filter((row) => row.period);
};

const normalizeFunnelStages = (response) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload?.days)) {
    const byStep = new Map();

    payload.days.forEach((day) => {
      const steps = Array.isArray(day?.steps) ? day.steps : [];
      steps.forEach((step, idx) => {
        const stepIndex = Number(step?.stepIndex ?? idx);
        const rawName = step?.eventName || step?.name || `STEP_${stepIndex + 1}`;
        const key = `${stepIndex}::${rawName}`;
        const prev = byStep.get(key) || {
          stepIndex,
          eventName: rawName,
          count: 0,
        };
        prev.count += Number(step?.usersReached ?? 0) || 0;
        byStep.set(key, prev);
      });
    });

    return Array.from(byStep.values())
      .sort((a, b) => a.stepIndex - b.stepIndex)
      .map((row, idx) => ({
        name: formatEventName(row.eventName),
        count: row.count,
        fill: ["#6366f1", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"][idx % 5],
      }));
  }

  const rows = Array.isArray(payload?.stages)
    ? payload.stages
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.funnel)
        ? payload.funnel
        : [];

  return rows
    .map((row, idx) => ({
      name: formatEventName(row?.eventName || row?.event || row?.name || row?.stage || row?.label || `Stage ${idx + 1}`),
      count: Number(row?.count ?? row?.users ?? row?.activeUsers ?? row?.value ?? 0) || 0,
      fill: ["#6366f1", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"][idx % 5],
    }))
    .filter((x) => x.name);
};

export default function EventsFunnelPage() {
  const [activeSubTab, setActiveSubTab] = useState("trend");
  const [eventOptions, setEventOptions] = useState([]);
  const [selectedEventValue, setSelectedEventValue] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [metricType, setMetricType] = useState("");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  const [activeRows, setActiveRows] = useState([]);
  const [activeSummary, setActiveSummary] = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState("");

  const [stagePickerValue, setStagePickerValue] = useState("");
  const [funnelStagesSelected, setFunnelStagesSelected] = useState([]);
  const [funnelRows, setFunnelRows] = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelError, setFunnelError] = useState("");

  const effectiveRange = useMemo(() => {
    const max = todayYmd();
    const from = clampYmd(fromDate, ANALYTICS_MIN_DATE, max);
    const to = clampYmd(toDate, ANALYTICS_MIN_DATE, max);
    return from <= to ? { from, to } : { from: to, to: from };
  }, [fromDate, toDate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setEventsLoading(true);
      setEventsError("");
      try {
        const parsed = normalizeEventNames(await fetchTrackingEventNames());
        if (!mounted) return;
        setEventOptions(parsed);
        if (parsed.length) {
          setSelectedEventValue((prev) => prev || parsed[0].value);
          setStagePickerValue(parsed[0].value);
        }
      } catch (err) {
        if (mounted) setEventsError(err?.message || "Failed to fetch event names");
      } finally {
        if (mounted) setEventsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedEventValue) return;
    let mounted = true;
    (async () => {
      setActiveLoading(true);
      setActiveError("");
      try {
        const query = { from: effectiveRange.from, to: effectiveRange.to, eventName: selectedEventValue };
        if (metricType) query.type = metricType;
        const response = await fetchActiveUsers(query);
        const rows = normalizeActiveRows(response);

        const root = response && typeof response === "object" ? response : {};
        const summarySource =
          root?.totalActiveUsers !== undefined || root?.count !== undefined
            ? root
            : root?.data && typeof root.data === "object" && !Array.isArray(root.data)
              ? root.data
              : {};

        if (!mounted) return;
        setActiveRows(rows);
        setActiveSummary({
          metric: summarySource?.metric || (metricType ? metricType.toUpperCase() : "DAU"),
          totalActiveUsers: Number(summarySource?.totalActiveUsers ?? 0) || 0,
          uniqueInRange: Number(summarySource?.uniqueInRange ?? 0) || 0,
          count: Number(summarySource?.count ?? rows.length ?? 0) || 0,
          from: summarySource?.from || effectiveRange.from,
          to: summarySource?.to || effectiveRange.to,
        });
      } catch (err) {
        if (!mounted) return;
        setActiveError(err?.message || "Failed to fetch event active users");
        setActiveRows([]);
        setActiveSummary(null);
      } finally {
        if (mounted) setActiveLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedEventValue, metricType, effectiveRange.from, effectiveRange.to]);

  useEffect(() => {
    if (activeSubTab !== "funnel") return;
    if (funnelStagesSelected.length < 2) {
      setFunnelRows([]);
      setFunnelError("");
      return;
    }

    let mounted = true;
    (async () => {
      setFunnelLoading(true);
      setFunnelError("");
      try {
        const payload = {
          identity: { primary: "sessionId", fallback: ["deviceId"] },
          screenSteps: funnelStagesSelected,
          from: `${effectiveRange.from}-00-00`,
          filters: metricType ? { type: metricType, to: `${effectiveRange.to}-23-59` } : { to: `${effectiveRange.to}-23-59` },
        };
        const response = await fetchTrackingFunnel(payload);
        const stages = normalizeFunnelStages(response);
        if (mounted) setFunnelRows(stages);
      } catch (err) {
        if (mounted) {
          setFunnelError(err?.message || "Failed to fetch funnel");
          setFunnelRows([]);
        }
      } finally {
        if (mounted) setFunnelLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeSubTab, funnelStagesSelected, metricType, effectiveRange.from, effectiveRange.to]);

  const selectedLabel = eventOptions.find((e) => e.value === selectedEventValue)?.label || "Select Event";
  const selectedMetricKey = String(metricType || activeSummary?.metric || "dau").toLowerCase();

  const graphData = activeRows.map((row) => ({
    label: formatBucketForMetric(row.period, selectedMetricKey),
    users: row.users,
  }));

  const topCards = [
    { label: "Metric", value: activeSummary?.metric || (metricType ? metricType.toUpperCase() : "-"), accent: "bg-indigo-500/10" },
    { label: "Count", value: Number(activeSummary?.count || 0).toLocaleString(), accent: "bg-sky-500/10" },
    { label: "Total Active Users", value: Number(activeSummary?.totalActiveUsers || 0).toLocaleString(), accent: "bg-emerald-500/10" },
    { label: "Unique In Range", value: Number(activeSummary?.uniqueInRange || 0).toLocaleString(), accent: "bg-violet-500/10" },
  ];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 ring-1 ring-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <p className="text-xs text-slate-500">Metric type + date range for selected event/funnel.</p>
          </div>
          <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            {effectiveRange.from} {"->"} {effectiveRange.to}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <label className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            Metric Type
            <select value={metricType} onChange={(e) => setMetricType(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700">
              {METRIC_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            From
            <input type="date" min={ANALYTICS_MIN_DATE} max={todayYmd()} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700" />
          </label>

          <label className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            To
            <input type="date" min={ANALYTICS_MIN_DATE} max={todayYmd()} value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700" />
          </label>
        </div>

        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setActiveSubTab("trend")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSubTab === "trend" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}>Trend</button>
          <button type="button" onClick={() => setActiveSubTab("funnel")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSubTab === "funnel" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}>Funnel</button>
        </div>
      </section>

      {activeSubTab === "trend" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {activeLoading
              ? topCards.map((card) => <ShimmerCard key={`shimmer-${card.label}`} accent={card.accent} />)
              : topCards.map((card) => (
                  <div key={card.label} className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
                    <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${card.accent}`} />
                    <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{card.value}</p>
                  </div>
                ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100/60">
              <h3 className="text-lg font-semibold text-slate-900">All Event Names</h3>
              <p className="mt-1 text-sm text-slate-600">Click event to call active users API.</p>

              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {eventsLoading ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading event names...</div> : null}
                {eventsError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{eventsError}</div> : null}
                {!eventsLoading && !eventsError && eventOptions.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">No event names returned.</div> : null}
                {!eventsLoading && !eventsError
                  ? eventOptions.map((event) => {
                      const active = event.value === selectedEventValue;
                      return (
                        <button key={event.value} type="button" onClick={() => setSelectedEventValue(event.value)} className={`w-full rounded-xl border px-4 py-3 text-left transition ${active ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                          <p className="text-sm font-semibold">{event.label}</p>
                          <p className="text-xs text-slate-500">{event.value}</p>
                        </button>
                      );
                    })
                  : null}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100/60">
              <h3 className="text-lg font-semibold text-slate-900">{selectedLabel} Active Users Trend</h3>
              <p className="mt-1 text-sm text-slate-600">{activeSummary ? `Range: ${activeSummary.from} to ${activeSummary.to}` : `Range: ${effectiveRange.from} to ${effectiveRange.to}`}</p>
              {activeError ? <p className="mt-2 text-sm text-rose-600">{activeError}</p> : null}

              <div className="mt-5 h-[380px] rounded-xl border border-slate-200 bg-white p-3">
                {activeLoading ? <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading graph...</div> : null}
                {!activeLoading && graphData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" />
                      <XAxis dataKey="label" padding={{ left: 0, right: 0 }} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip formatter={(value) => [Number(value || 0).toLocaleString(), "Active Users"]} />
                      <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : null}
                {!activeLoading && !graphData.length ? <div className="flex h-full items-center justify-center text-sm text-slate-500">No graph data for selected event.</div> : null}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100/60">
            <h3 className="text-lg font-semibold text-slate-900">Build Funnel</h3>
            <p className="mt-1 text-sm text-slate-600">Pick ordered events (2 or more) to compare drop-off in one API call.</p>

            <div className="mt-4 flex gap-2">
              <select value={stagePickerValue} onChange={(e) => setStagePickerValue(e.target.value)} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {eventOptions.map((event) => (
                  <option key={event.value} value={event.value}>{event.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!stagePickerValue) return;
                  if (funnelStagesSelected.includes(stagePickerValue)) return;
                  setFunnelStagesSelected((prev) => [...prev, stagePickerValue]);
                }}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Add
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {funnelStagesSelected.map((value, idx) => (
                <div key={value} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Stage {idx + 1}</p>
                    <p className="text-sm font-semibold text-slate-800">{formatEventName(value)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => idx > 0 && setFunnelStagesSelected((prev) => {
                      const next = [...prev];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      return next;
                    })} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700">Up</button>
                    <button type="button" onClick={() => idx < funnelStagesSelected.length - 1 && setFunnelStagesSelected((prev) => {
                      const next = [...prev];
                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                      return next;
                    })} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700">Down</button>
                    <button type="button" onClick={() => setFunnelStagesSelected((prev) => prev.filter((x) => x !== value))} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {funnelStagesSelected.length < 2 ? <p className="mt-3 text-sm text-slate-500">Add at least 2 events to draw funnel.</p> : null}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100/60">
            <h3 className="text-lg font-semibold text-slate-900">Funnel Visualization</h3>
            <p className="mt-1 text-sm text-slate-600">Range: {effectiveRange.from} to {effectiveRange.to}</p>
            {funnelError ? <p className="mt-2 text-sm text-rose-600">{funnelError}</p> : null}

            <div className="mt-4 h-[420px] rounded-xl border border-slate-200 bg-white p-3">
              {funnelLoading ? <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading funnel...</div> : null}
              {!funnelLoading && funnelRows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip formatter={(value) => [Number(value || 0).toLocaleString(), "Users"]} />
                    <Funnel dataKey="count" data={funnelRows} isAnimationActive width={440}>
                      <LabelList position="right" fill="#334155" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              ) : null}
              {!funnelLoading && !funnelRows.length ? <div className="flex h-full items-center justify-center text-sm text-slate-500">No funnel data yet.</div> : null}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
