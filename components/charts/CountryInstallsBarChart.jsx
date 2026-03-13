"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { country: "US", installs: 82000 },
  { country: "IN", installs: 64000 },
  { country: "BR", installs: 38000 },
  { country: "ID", installs: 26000 },
  { country: "DE", installs: 21000 },
];

function CountryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <div className="font-semibold text-slate-900">{label}</div>
      <div className="mt-1.5 text-slate-600">
        Installs: <span className="font-semibold text-slate-900">{value?.toLocaleString()}</span>
      </div>
    </div>
  );
}

const INDIGO = "#4f46e5";
const tickStyle = { fontSize: 13, fill: "#64748b", fontWeight: 500 };

export default function CountryInstallsBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
        <XAxis
          dataKey="country"
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
          width={40}
        />
        <Tooltip content={<CountryTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        <Bar dataKey="installs" radius={[6, 6, 0, 0]} fill={INDIGO} name="Installs" />
      </BarChart>
    </ResponsiveContainer>
  );
}
