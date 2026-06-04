"use client";

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 1000) return `${Math.round(num)}`;
  const thousandsValue = num / 1000;
  const fixed = thousandsValue.toFixed(2);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return `${trimmed} k`;
}

const KPI_CARDS = [
  { label: "Total KPIs", key: "totalKpis", format: "number" },
  { label: "Users unlocked", key: "usersUnlocked", format: "number" },
  { label: "Completion rate", key: "completionRate", format: "percent" },
  { label: "Points awarded", key: "pointsAwarded", format: "number" },
];

function formatValue(value, format) {
  if (value === null || value === undefined) return "—";
  if (format === "percent") {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return `${Math.round(num)}%`;
  }
  return formatCompact(value);
}

export default function AchievementsPage() {
  const stats = {
    totalKpis: null,
    usersUnlocked: null,
    completionRate: null,
    pointsAwarded: null,
  };

  return (
    <main className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.key}
            className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {formatValue(stats[card.key], card.format)}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
