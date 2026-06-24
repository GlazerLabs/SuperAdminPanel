"use client";

import { EmptyPanel } from "./KpiSection";

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 1000) return `${Math.round(num)}`;
  return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function formatPercent(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `${Math.round(num)}%`;
}

export default function KpiPerformanceTable({ rows, emptyTitle = "No data" }) {
  if (!rows.length) {
    return <EmptyPanel title={emptyTitle} />;
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/80">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Achievement
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Points
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unlocked
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Completion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const completion = Math.max(0, Math.min(100, Number(row.completionPercent) || 0));
              return (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-400">#{row.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.type}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">{formatCompact(row.points)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatCompact(row.usersUnlocked)}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-32 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-medium tabular-nums text-slate-600">
                        {formatPercent(completion)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
