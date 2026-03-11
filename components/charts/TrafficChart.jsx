"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Dummy data roughly matching what you might get from Google Play metrics
const data = [
  { date: "Feb 11", installs: 209000, dau: 900 },
  { date: "Feb 15", installs: 209150, dau: 820 },
  { date: "Feb 20", installs: 209320, dau: 760 },
  { date: "Feb 25", installs: 209550, dau: 710 },
  { date: "Mar 1", installs: 209900, dau: 650 },
  { date: "Mar 5", installs: 210200, dau: 610 },
  { date: "Mar 10", installs: 210600, dau: 580 },
];

function TrafficTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const installs = payload.find((p) => p.dataKey === "installs")?.value;
  const dau = payload.find((p) => p.dataKey === "dau")?.value;

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-[11px] shadow-sm">
      <div className="font-medium text-zinc-800">{label}</div>
      {installs != null && (
        <div className="mt-1 text-zinc-500">
          Installs:{" "}
          <span className="font-medium text-zinc-800">
            {installs.toLocaleString()}
          </span>
        </div>
      )}
      {dau != null && (
        <div className="text-zinc-500">
          Daily active users:{" "}
          <span className="font-medium text-zinc-800">
            {dau.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TrafficChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="installsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3399EF" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#3399EF" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FE5E2C" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#FE5E2C" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
        />
        <YAxis
          hide
          domain={["auto", "auto"]}
        />
        <Tooltip content={<TrafficTooltip />} cursor={{ stroke: "#e5e7eb" }} />

        <Area
          type="monotone"
          dataKey="installs"
          stroke="#3399EF"
          strokeWidth={2}
          fill="url(#installsGradient)"
          name="Installs"
        />
        <Area
          type="monotone"
          dataKey="dau"
          stroke="#FE5E2C"
          strokeWidth={2}
          fill="url(#dauGradient)"
          name="Daily active users"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

