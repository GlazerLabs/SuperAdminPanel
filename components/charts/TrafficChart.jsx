"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const FALLBACK_DATA = [
  { date: "Feb 11", activeUsers: 900, totalRevenue: 1200 },
  { date: "Feb 15", activeUsers: 820, totalRevenue: 900 },
  { date: "Feb 20", activeUsers: 760, totalRevenue: 750 },
  { date: "Feb 25", activeUsers: 710, totalRevenue: 680 },
  { date: "Mar 1", activeUsers: 650, totalRevenue: 640 },
  { date: "Mar 5", activeUsers: 610, totalRevenue: 620 },
  { date: "Mar 10", activeUsers: 580, totalRevenue: 610 },
];

function TrafficTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const activeUsers = payload.find((p) => p.dataKey === "activeUsers")?.value;
  const totalRevenue = payload.find((p) => p.dataKey === "totalRevenue")?.value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <div className="font-semibold text-slate-900">{label}</div>
      {activeUsers != null && (
        <div className="mt-1.5 text-slate-600">
          Active users:{" "}
          <span className="font-semibold text-slate-900">
            {activeUsers.toLocaleString()}
          </span>
        </div>
      )}
      {totalRevenue != null && (
        <div className="text-slate-600">
          Revenue:{" "}
          <span className="font-semibold text-slate-900">
            {totalRevenue.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

const INDIGO = "#4f46e5";
const VIOLET = "#7c3aed";
const tickStyle = { fontSize: 13, fill: "#64748b", fontWeight: 500 };

export default function TrafficChart({ data }) {
  const chartData = Array.isArray(data) && data.length ? data : FALLBACK_DATA;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id="trafficInstallsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INDIGO} stopOpacity={0.35} />
            <stop offset="100%" stopColor={INDIGO} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="trafficDauGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIOLET} stopOpacity={0.3} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={tickStyle}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={tickStyle}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : String(v))}
          width={42}
        />
        <Tooltip content={<TrafficTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
        <Legend
          wrapperStyle={{ paddingTop: 8 }}
          formatter={(value) => <span className="text-sm font-medium text-slate-600">{value}</span>}
          iconType="circle"
          iconSize={10}
        />

        <Area
          type="monotone"
          dataKey="activeUsers"
          stroke={VIOLET}
          strokeWidth={2.5}
          fill="url(#trafficDauGrad)"
          name="Active users"
        />
        <Area
          type="monotone"
          dataKey="totalRevenue"
          stroke={INDIGO}
          strokeWidth={2.5}
          fill="url(#trafficInstallsGrad)"
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
