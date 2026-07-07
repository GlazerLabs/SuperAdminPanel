"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyPanel, SectionCard, ShimmerCard } from "@/components/kpi-analytics/KpiSection";
import { fetchGameAnalytics, fetchGameTimeAnalytics, fetchGamesList } from "@/gameAnalyticsApi";

const INDIGO = "#4f46e5";
const VIOLET = "#7c3aed";
const EMERALD = "#059669";
const tickStyle = { fontSize: 13, fill: "#64748b", fontWeight: 500 };
const INTERVAL_OPTIONS = [1, 2, 3, 4, 6];
const DEFAULT_INTERVAL_HOURS = 3;

const ALL_TIME_CARDS = [
  {
    key: "totalPlays",
    label: "Total Plays",
    hint: "All time",
    format: "count",
  },
  {
    key: "uniqueUsers",
    label: "Unique users",
    hint: "All time",
    format: "count",
  },
];

const SUMMARY_CARDS = [
  {
    key: "uniqueUsers",
    label: "Unique users",
    hint: "Within selected range",
    format: "count",
  },
  {
    key: "totalPlays",
    label: "Total Plays",
    hint: "Within selected range",
    format: "count",
  },
  {
    key: "totalDurationMinutes",
    label: "Total time played",
    hint: "Within selected range",
    format: "minutes",
  },
  {
    key: "avgDurationMinutes",
    label: "Avg time / play",
    hint: "Within selected range",
    format: "minutes",
  },
];

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6); // last 7 days inclusive
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 1000) return `${Math.round(num)}`;
  const thousandsValue = num / 1000;
  const fixed = thousandsValue.toFixed(2);
  return `${fixed.replace(/\.?0+$/, "")}k`;
}

function formatMinutes(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 60) return `${Math.round(num * 10) / 10} min`;
  const hours = Math.floor(num / 60);
  const mins = Math.round(num % 60);
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatCardValue(value, format) {
  if (value === null || value === undefined) return "—";
  if (format === "minutes") return formatMinutes(value);
  return formatCompact(value);
}

function formatAxisValue(v) {
  return v >= 1000 ? `${v / 1000}K` : String(v);
}

function formatDrillDownDate(dateKey) {
  if (!dateKey) return "—";
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <div className="font-semibold text-slate-900">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="mt-1.5 text-slate-600">
          {item.name}:{" "}
          <span className="font-semibold text-slate-900">
            {Number(item.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GameAnalyticsPage() {
  const initialRange = useMemo(() => defaultRange(), []);

  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const [analytics, setAnalytics] = useState(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [drillDownDate, setDrillDownDate] = useState(null);
  const [intervalHours, setIntervalHours] = useState(DEFAULT_INTERVAL_HOURS);
  const [timeAnalytics, setTimeAnalytics] = useState(null);
  const [timeLoading, setTimeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGamesLoading(true);
      try {
        const list = await fetchGamesList();
        if (cancelled) return;
        setGames(list);
        setSelectedGameId((current) => current || list[0]?.id || "");
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load games");
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!selectedGameId) return;
    const game = games.find((g) => String(g.id) === String(selectedGameId));
    if (!game) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchGameAnalytics({
        gameName: game.name,
        startDate,
        endDate,
      });
      setAnalytics(data);
    } catch (err) {
      setError(err?.message || "Failed to load game analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [games, selectedGameId, startDate, endDate]);

  useEffect(() => {
    loadAnalytics();
    setDrillDownDate(null);
    setTimeAnalytics(null);
  }, [loadAnalytics]);

  const selectedGame = games.find((g) => String(g.id) === String(selectedGameId));

  const loadTimeAnalytics = useCallback(async () => {
    if (!drillDownDate || !selectedGame) return;
    setTimeLoading(true);
    setError("");
    try {
      const data = await fetchGameTimeAnalytics({
        gameName: selectedGame.name,
        date: drillDownDate,
        intervalHours,
      });
      setTimeAnalytics(data);
    } catch (err) {
      setError(err?.message || "Failed to load time analytics");
      setTimeAnalytics(null);
    } finally {
      setTimeLoading(false);
    }
  }, [drillDownDate, selectedGame, intervalHours]);

  useEffect(() => {
    if (!drillDownDate) {
      setTimeAnalytics(null);
      return;
    }
    loadTimeAnalytics();
  }, [drillDownDate, loadTimeAnalytics]);

  const dailyChartData = useMemo(
    () =>
      (analytics?.timeline || []).map((row) => ({
        date: row.date,
        label: row.label,
        users: row.users,
        plays: row.plays,
        durationMinutes: row.durationMinutes,
      })),
    [analytics?.timeline]
  );

  const timeChartData = useMemo(
    () =>
      (timeAnalytics?.timeline || []).map((row) => ({
        label: row.label,
        users: row.users,
        plays: row.plays,
        durationMinutes: row.durationMinutes,
      })),
    [timeAnalytics?.timeline]
  );

  const chartData = drillDownDate ? timeChartData : dailyChartData;
  const isDrillDown = Boolean(drillDownDate);

  const isLoading = gamesLoading || loading;
  const chartLoading = isLoading || (isDrillDown && timeLoading);

  const handleDailyChartClick = useCallback(
    (state) => {
      if (isDrillDown || chartLoading) return;
      const label = state?.activeLabel;
      if (!label) return;
      const row = dailyChartData.find((item) => item.label === label);
      if (row?.date) setDrillDownDate(row.date);
    },
    [isDrillDown, chartLoading, dailyChartData]
  );

  const handleDateLabelClick = useCallback(
    (label) => {
      if (isDrillDown || chartLoading) return;
      const row = dailyChartData.find((item) => item.label === label);
      if (row?.date) setDrillDownDate(row.date);
    },
    [isDrillDown, chartLoading, dailyChartData]
  );

  const renderDailyTick = useCallback(
    ({ x, y, payload }) => (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#64748b"
          fontSize={13}
          fontWeight={500}
          style={{ cursor: "pointer" }}
          onClick={() => handleDateLabelClick(payload.value)}
        >
          {payload.value}
        </text>
      </g>
    ),
    [handleDateLabelClick]
  );

  const handleExportCsv = useCallback(() => {
    const rows = isDrillDown ? timeAnalytics?.timeline || [] : analytics?.timeline || [];
    if (!rows.length) return;

    const header = isDrillDown
      ? ["Time slot", "Unique Users", "Total Players", "Played Minutes"]
      : ["Date", "Unique Users", "Total Players", "Played Minutes"];
    const lines = rows.map((row) =>
      isDrillDown
        ? [row.label, row.users, row.plays, row.durationMinutes]
        : [row.date, row.users, row.plays, row.durationMinutes]
    );

    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const gameSlug = (selectedGame?.name || "game").replace(/\s+/g, "_").toLowerCase();
    link.href = url;
    link.download = isDrillDown
      ? `game-analytics_${gameSlug}_${drillDownDate}_${intervalHours}h.csv`
      : `game-analytics_${gameSlug}_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    analytics?.timeline,
    timeAnalytics?.timeline,
    selectedGame?.name,
    startDate,
    endDate,
    drillDownDate,
    intervalHours,
    isDrillDown,
  ]);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Game Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Player engagement metrics{selectedGame ? ` for ${selectedGame.name}` : ""}.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Game</span>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              disabled={gamesLoading}
              className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            >
              {gamesLoading ? <option>Loading…</option> : null}
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">From</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">To</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={initialRange.endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        {isLoading
          ? ALL_TIME_CARDS.map((card) => <ShimmerCard key={card.key} />)
          : ALL_TIME_CARDS.map((card) => (
              <div
                key={card.key}
                className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 p-5 shadow-md shadow-indigo-200/60"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-white/10" />
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-100">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                  {formatCardValue(analytics?.allTime?.[card.key], card.format)}
                </p>
                <p className="mt-2 text-xs text-indigo-100/80">{card.hint}</p>
              </div>
            ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? SUMMARY_CARDS.map((card) => <ShimmerCard key={card.key} />)
          : SUMMARY_CARDS.map((card) => (
              <div
                key={card.key}
                className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {formatCardValue(analytics?.[card.key], card.format)}
                </p>
                <p className="mt-2 text-xs text-slate-400">{card.hint}</p>
              </div>
            ))}
      </section>

      <SectionCard
        title={
          isDrillDown
            ? `Hourly breakdown — ${formatDrillDownDate(drillDownDate)}`
            : "Total Players vs. Unique Users vs. Time Played"
        }
        subtitle={
          isDrillDown
            ? `${intervalHours}-hour time slots for the selected day. Change the interval or go back to the daily view.`
            : "Daily total players, unique users, and total minutes played. Click a date to drill down."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isDrillDown ? (
              <>
                <label className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Interval
                  </span>
                  <select
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {INTERVAL_OPTIONS.map((hours) => (
                      <option key={hours} value={hours}>
                        {hours} hr{hours === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setDrillDownDate(null);
                    setTimeAnalytics(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-2 stroke-slate-500" fill="none" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Daily view
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={chartLoading || !chartData.length}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-2 stroke-slate-500" fill="none" aria-hidden="true">
                <path d="M12 4v10" />
                <path d="M8.5 10.5 12 14l3.5-3.5" />
                <path d="M5 19h14" />
              </svg>
              Export CSV
            </button>
          </div>
        }
      >
        {chartLoading ? (
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
        ) : chartData.length ? (
          <div className={`h-72 ${!isDrillDown ? "cursor-pointer" : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
                onClick={!isDrillDown ? handleDailyChartClick : undefined}
              >
                <defs>
                  <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INDIGO} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={isDrillDown ? tickStyle : renderDailyTick}
                  interval={isDrillDown ? 0 : "preserveStartEnd"}
                  angle={isDrillDown ? -35 : 0}
                  textAnchor={isDrillDown ? "end" : "middle"}
                  height={isDrillDown ? 56 : 30}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={tickStyle}
                  allowDecimals={false}
                  width={40}
                  tickFormatter={formatAxisValue}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={tickStyle}
                  width={48}
                  tickFormatter={(v) => `${formatAxisValue(v)}m`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="users"
                  stroke={INDIGO}
                  strokeWidth={2}
                  fill="url(#usersFill)"
                  name="Unique users"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="plays"
                  stroke={VIOLET}
                  strokeWidth={2}
                  dot={isDrillDown}
                  name="Total players"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="durationMinutes"
                  stroke={EMERALD}
                  strokeWidth={2}
                  dot={isDrillDown}
                  name="Time played (min)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyPanel
            title="No data"
            description={
              isDrillDown
                ? "No activity for the selected day and time interval."
                : "No activity for the selected game and range."
            }
          />
        )}
      </SectionCard>
    </main>
  );
}


///Refactored

// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   Area,
//   CartesianGrid,
//   ComposedChart,
//   Legend,
//   Line,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from "recharts";
// import { EmptyPanel, SectionCard, ShimmerCard } from "@/components/kpi-analytics/KpiSection";
// import { fetchGameAnalytics, fetchGamesList } from "@/gameAnalyticsApi";

// const INDIGO = "#4f46e5";
// const VIOLET = "#7c3aed";
// const EMERALD = "#059669";
// const tickStyle = { fontSize: 13, fill: "#64748b", fontWeight: 500 };

// const SUMMARY_CARDS = [
//   {
//     key: "uniqueUsers",
//     label: "Unique users",
//     hint: "Within selected range",
//     format: "count",
//   },
//   {
//     key: "totalPlays",
//     label: "Total Plays",
//     hint: "Within selected range",
//     format: "count",
//   },
//   {
//     key: "totalDurationMinutes",
//     label: "Total time played",
//     hint: "Within selected range",
//     format: "minutes",
//   },
//   {
//     key: "avgDurationMinutes",
//     label: "Avg time / play",
//     hint: "Within selected range",
//     format: "minutes",
//   },
// ];

// function toDateInput(date) {
//   return date.toISOString().slice(0, 10);
// }

// function defaultRange() {
//   const end = new Date();
//   const start = new Date();
//   start.setDate(end.getDate() - 6);
//   return { startDate: toDateInput(start), endDate: toDateInput(end) };
// }

// function formatCompact(n) {
//   const num = Number(n);
//   if (!Number.isFinite(num)) return "—";
//   if (num < 1000) return `${Math.round(num)}`;
//   const thousandsValue = num / 1000;
//   const fixed = thousandsValue.toFixed(2);
//   return `${fixed.replace(/\.?0+$/, "")}k`;
// }

// function formatMinutes(n) {
//   const num = Number(n);
//   if (!Number.isFinite(num)) return "—";
//   if (num < 60) return `${Math.round(num * 10) / 10} min`;
//   const hours = Math.floor(num / 60);
//   const mins = Math.round(num % 60);
//   return mins ? `${hours}h ${mins}m` : `${hours}h`;
// }

// function formatCardValue(value, format) {
//   if (value === null || value === undefined) return "—";
//   if (format === "minutes") return formatMinutes(value);
//   return formatCompact(value);
// }

// function formatAxisValue(v) {
//   return v >= 1000 ? `${v / 1000}K` : String(v);
// }

// function ChartTooltip({ active, payload, label }) {
//   if (!active || !payload?.length) return null;
//   return (
//     <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
//       <div className="font-semibold text-slate-900">{label}</div>
//       {payload.map((item) => (
//         <div key={item.name} className="mt-1.5 text-slate-600">
//           {item.name}:{" "}
//           <span className="font-semibold text-slate-900">
//             {Number(item.value || 0).toLocaleString()}
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// }

// // Helper function to normalize response data - handles both old and new formats
// function normalizeAnalyticsResponse(data) {
//   // If data has a 'range' property, it's in the new format
//   if (data.range) {
//     // Use range.overall for the range-specific totals
//     const rangeOverall = data.range.overall || {};
    
//     return {
//       ...data,
//       // Use range.overall for summary cards (these are the range-specific totals)
//       uniqueUsers: rangeOverall.uniqueUsers || 0,
//       totalPlays: rangeOverall.totalPlays || 0,
//       totalDurationMinutes: rangeOverall.totalDurationMinutes || 0,
//       avgDurationMinutes: rangeOverall.avgDurationMinutes || 0,
//       // Build timeline from range.days for the chart
//       timeline: (data.range.days || []).map(day => ({
//         date: day.day,
//         label: day.day,
//         users: day.uniqueUsers || 0,
//         plays: day.plays || 0,
//         durationMinutes: day.totalDurationMinutes || 0,
//         avgDurationMinutes: day.avgDurationMinutes || 0
//       })),
//       // Keep the original data for reference
//       _rangeData: data.range,
//       _overallData: data.overall
//     };
//   }
  
//   // Handle old format (flat structure)
//   return {
//     ...data,
//     timeline: (data.days || []).map(day => ({
//       date: day.day,
//       label: day.day,
//       users: day.uniqueUsers || 0,
//       plays: day.plays || 0,
//       durationMinutes: day.totalDurationMinutes || 0,
//       avgDurationMinutes: day.avgDurationMinutes || 0
//     })),
//     _rangeData: {
//       from: data.from,
//       to: data.to,
//       overall: {
//         totalPlays: data.totalPlays || 0,
//         playsWithDuration: data.totalPlays || 0,
//         uniqueUsers: data.uniqueUsers || 0,
//         totalDurationMinutes: data.totalDurationMinutes || 0,
//         avgDurationMinutes: data.avgDurationMinutes || 0
//       },
//       dateWise: data.dateWise,
//       count: data.count,
//       days: data.days || []
//     }
//   };
// }

// export default function GameAnalyticsPage() {
//   const initialRange = useMemo(() => defaultRange(), []);

//   const [games, setGames] = useState([]);
//   const [selectedGameId, setSelectedGameId] = useState("");
//   const [startDate, setStartDate] = useState(initialRange.startDate);
//   const [endDate, setEndDate] = useState(initialRange.endDate);

//   const [analytics, setAnalytics] = useState(null);
//   const [gamesLoading, setGamesLoading] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       setGamesLoading(true);
//       try {
//         const list = await fetchGamesList();
//         if (cancelled) return;
//         setGames(list);
//         setSelectedGameId((current) => current || list[0]?.id || "");
//       } catch (err) {
//         if (!cancelled) setError(err?.message || "Failed to load games");
//       } finally {
//         if (!cancelled) setGamesLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   const loadAnalytics = useCallback(async () => {
//     if (!selectedGameId) return;
//     const game = games.find((g) => String(g.id) === String(selectedGameId));
//     if (!game) return;
//     setLoading(true);
//     setError("");
//     try {
//       const data = await fetchGameAnalytics({
//         gameName: game.name,
//         startDate,
//         endDate,
//       });
//       // Normalize the response to handle both formats
//       const normalizedData = normalizeAnalyticsResponse(data);
//       setAnalytics(normalizedData);
//     } catch (err) {
//       setError(err?.message || "Failed to load game analytics");
//       setAnalytics(null);
//     } finally {
//       setLoading(false);
//     }
//   }, [games, selectedGameId, startDate, endDate]);

//   useEffect(() => {
//     loadAnalytics();
//   }, [loadAnalytics]);

//   const chartData = useMemo(
//     () => analytics?.timeline || [],
//     [analytics?.timeline]
//   );

//   const isLoading = gamesLoading || loading;
//   const selectedGame = games.find((g) => String(g.id) === String(selectedGameId));

//   const handleExportCsv = useCallback(() => {
//     const daysData = analytics?._rangeData?.days || analytics?.days || [];
//     if (!daysData.length) return;

//     const header = ["Date", "Unique Users", "Total Players", "Played Minutes"];
//     const lines = daysData.map((row) => [
//       row.day,
//       row.uniqueUsers,
//       row.plays,
//       row.totalDurationMinutes,
//     ]);

//     const csv = [header, ...lines]
//       .map((cols) => cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
//       .join("\n");

//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     const gameSlug = (selectedGame?.name || "game").replace(/\s+/g, "_").toLowerCase();
//     link.href = url;
//     link.download = `game-analytics_${gameSlug}_${startDate}_to_${endDate}.csv`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   }, [analytics, selectedGame?.name, startDate, endDate]);

//   return (
//     <main className="space-y-6">
//       <div className="flex flex-wrap items-end justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold tracking-tight text-slate-900">Game Analytics</h1>
//           <p className="mt-1 text-sm text-slate-500">
//             Player engagement metrics{selectedGame ? ` for ${selectedGame.name}` : ""}.
//           </p>
//         </div>

//         <div className="flex flex-wrap items-end gap-3">
//           <label className="flex flex-col gap-1">
//             <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Game</span>
//             <select
//               value={selectedGameId}
//               onChange={(e) => setSelectedGameId(e.target.value)}
//               disabled={gamesLoading}
//               className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
//             >
//               {gamesLoading ? <option>Loading…</option> : null}
//               {games.map((game) => (
//                 <option key={game.id} value={game.id}>
//                   {game.name}
//                 </option>
//               ))}
//             </select>
//           </label>

//           <label className="flex flex-col gap-1">
//             <span className="text-xs font-medium uppercase tracking-wider text-slate-500">From</span>
//             <input
//               type="date"
//               value={startDate}
//               max={endDate}
//               onChange={(e) => setStartDate(e.target.value)}
//               className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
//             />
//           </label>

//           <label className="flex flex-col gap-1">
//             <span className="text-xs font-medium uppercase tracking-wider text-slate-500">To</span>
//             <input
//               type="date"
//               value={endDate}
//               min={startDate}
//               max={initialRange.endDate}
//               onChange={(e) => setEndDate(e.target.value)}
//               className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
//             />
//           </label>
//         </div>
//       </div>

//       {error ? (
//         <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
//           {error}
//         </div>
//       ) : null}

//       <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
//         {isLoading
//           ? SUMMARY_CARDS.map((card) => <ShimmerCard key={card.key} />)
//           : SUMMARY_CARDS.map((card) => (
//               <div
//                 key={card.key}
//                 className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
//               >
//                 <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
//                 <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
//                   {card.label}
//                 </p>
//                 <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
//                   {formatCardValue(analytics?.[card.key], card.format)}
//                 </p>
//                 <p className="mt-2 text-xs text-slate-400">{card.hint}</p>
//               </div>
//             ))}
//       </section>

//       <SectionCard
//         title="Total Players vs. Unique Users vs. Time Played"
//         subtitle="Daily total players, unique users, and total minutes played for the selected range."
//         action={
//           <button
//             type="button"
//             onClick={handleExportCsv}
//             disabled={isLoading || !chartData.length}
//             className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
//           >
//             <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-2 stroke-slate-500" fill="none" aria-hidden="true">
//               <path d="M12 4v10" />
//               <path d="M8.5 10.5 12 14l3.5-3.5" />
//               <path d="M5 19h14" />
//             </svg>
//             Export CSV
//           </button>
//         }
//       >
//         {isLoading ? (
//           <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
//         ) : chartData.length ? (
//           <div className="h-72">
//             <ResponsiveContainer width="100%" height="100%">
//               <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
//                 <defs>
//                   <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="0%" stopColor={INDIGO} stopOpacity={0.25} />
//                     <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
//                 <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
//                 <YAxis
//                   yAxisId="left"
//                   tickLine={false}
//                   axisLine={false}
//                   tickMargin={8}
//                   tick={tickStyle}
//                   allowDecimals={false}
//                   width={40}
//                   tickFormatter={formatAxisValue}
//                 />
//                 <YAxis
//                   yAxisId="right"
//                   orientation="right"
//                   tickLine={false}
//                   axisLine={false}
//                   tickMargin={8}
//                   tick={tickStyle}
//                   width={48}
//                   tickFormatter={(v) => `${formatAxisValue(v)}m`}
//                 />
//                 <Tooltip content={<ChartTooltip />} />
//                 <Legend
//                   iconType="plainline"
//                   wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8 }}
//                 />
//                 <Area
//                   yAxisId="left"
//                   type="monotone"
//                   dataKey="users"
//                   stroke={INDIGO}
//                   strokeWidth={2}
//                   fill="url(#usersFill)"
//                   name="Unique users"
//                 />
//                 <Line
//                   yAxisId="left"
//                   type="monotone"
//                   dataKey="plays"
//                   stroke={VIOLET}
//                   strokeWidth={2}
//                   dot={false}
//                   name="Total players"
//                 />
//                 <Line
//                   yAxisId="right"
//                   type="monotone"
//                   dataKey="durationMinutes"
//                   stroke={EMERALD}
//                   strokeWidth={2}
//                   dot={false}
//                   name="Time played (min)"
//                 />
//               </ComposedChart>
//             </ResponsiveContainer>
//           </div>
//         ) : (
//           <EmptyPanel title="No data" description="No activity for the selected game and range." />
//         )}
//       </SectionCard>
//     </main>
//   );
// }
