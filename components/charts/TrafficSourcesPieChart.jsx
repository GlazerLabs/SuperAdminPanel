"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Dummy traffic sources (similar to Play Store acquisition channels)
const data = [
  { name: "Search", value: 45 },
  { name: "Browse", value: 25 },
  { name: "Referral", value: 18 },
  { name: "Ad campaigns", value: 12 },
];

const COLORS = ["#4f46e5", "#7c3aed", "#d97706", "#059669"];

function SourcesTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <div className="font-semibold text-slate-900">{name}</div>
      <div className="mt-1.5 text-slate-600">
        Share: <span className="font-semibold text-slate-900">{value}%</span>
      </div>
    </div>
  );
}

export default function TrafficSourcesPieChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="40%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.name}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<SourcesTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

