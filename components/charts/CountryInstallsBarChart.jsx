"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Dummy installs by country (could map to Play Store country breakdown)
const data = [
  { country: "US", installs: 82000 },
  { country: "IN", installs: 64000 },
  { country: "BR", installs: 38000 },
  { country: "ID", installs: 26000 },
  { country: "DE", installs: 21000 },
];

function CountryTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0];

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-[11px] shadow-sm">
      <div className="font-medium text-zinc-800">{label}</div>
      <div className="mt-1 text-zinc-500">
        Installs:{" "}
        <span className="font-medium text-zinc-800">
          {point.value?.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function CountryInstallsBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="country"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
        />
        <YAxis hide />
        <Tooltip content={<CountryTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
        <Bar
          dataKey="installs"
          radius={[8, 8, 0, 0]}
          fill="#3399EF"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

