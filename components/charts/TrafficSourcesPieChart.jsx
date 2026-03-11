"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Dummy traffic sources (similar to Play Store acquisition channels)
const data = [
  { name: "Search", value: 45 },
  { name: "Browse", value: 25 },
  { name: "Referral", value: 18 },
  { name: "Ad campaigns", value: 12 },
];

const COLORS = ["#3399EF", "#FE20CC", "#FE5E2C", "#22C55E"];

function SourcesTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const { name, value } = payload[0];

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-[11px] shadow-sm">
      <div className="font-medium text-zinc-800">{name}</div>
      <div className="mt-1 text-zinc-500">
        Share:{" "}
        <span className="font-medium text-zinc-800">{value}%</span>
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

