"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function MiniTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0];

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] shadow-sm">
      <div className="font-medium text-zinc-800">{label}</div>
      <div className="text-zinc-500">{point.value?.toLocaleString()}</div>
    </div>
  );
}

const deltaColorMap = {
  up: "text-emerald-600 bg-emerald-50",
  down: "text-rose-600 bg-rose-50",
  neutral: "text-zinc-600 bg-zinc-100",
};

export default function MiniMetricCard({
  title,
  value,
  delta,
  deltaColor = "neutral",
  unit,
  rangeLabel,
  data,
}) {
  const deltaClasses =
    deltaColorMap[deltaColor] ?? deltaColorMap.neutral;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-zinc-500">{title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <p className="text-xl font-semibold text-zinc-900">{value}</p>
            {unit ? (
              <span className="text-[11px] text-zinc-500">{unit}</span>
            ) : null}
          </div>
        </div>
        {delta ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${deltaClasses}`}
          >
            {delta}
          </span>
        ) : null}
      </div>

      <div className="mt-1 text-[10px] text-zinc-400">{rangeLabel}</div>

      <div className="mt-3 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
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
            <Tooltip
              content={<MiniTooltip />}
              cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

