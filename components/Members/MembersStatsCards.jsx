"use client";

function clampPercent(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999, Math.round(n)));
}

function StatCard({
  title,
  value,
  deltaPercent,
  accent = "indigo",
  icon = "users",
}) {
  const accentMap = {
    indigo: {
      tile: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
      dot: "bg-indigo-500",
      deltaBadge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    },
    violet: {
      tile: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
      dot: "bg-violet-500",
      deltaBadge: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
    },
    emerald: {
      tile: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      dot: "bg-emerald-500",
      deltaBadge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    },
  };

  const colors = accentMap[accent] ?? accentMap.indigo;

  const Icon = (() => {
    switch (icon) {
      case "calendar":
        return (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 2v3M16 2v3" />
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
          </svg>
        );
      case "users":
      default:
        return (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
    }
  })();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${colors.tile} sm:h-12 sm:w-12`}
            aria-hidden="true"
          >
            <span className="scale-105 sm:scale-110">{Icon}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 sm:text-base">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {value}
            </p>
          </div>
        </div>

        <div
          className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${colors.deltaBadge}`}
        >
          <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
          <span>+{clampPercent(deltaPercent)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function MembersStatsCards({
  total,
  lastWeek = 0,
  lastMonth = 0,
  label = "Users", // "Users" | "Organizers" | "Teams"
}) {
  const safeTotal = Math.max(1, Number(total) || 0);
  const weekDelta = (Number(lastWeek) / safeTotal) * 100;
  const monthDelta = (Number(lastMonth) / safeTotal) * 100;

  return (
    <section className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="card-fade-up">
        <StatCard
          title={`Total ${label}`}
          value={total}
          deltaPercent={12}
          accent="indigo"
          icon="users"
        />
      </div>
      <div className="card-fade-up">
        <StatCard
          title={`Last week ${label}`}
          value={lastWeek}
          deltaPercent={weekDelta}
          accent="violet"
          icon="calendar"
        />
      </div>
      <div className="card-fade-up">
        <StatCard
          title={`Last month ${label}`}
          value={lastMonth}
          deltaPercent={monthDelta}
          accent="emerald"
          icon="calendar"
        />
      </div>
    </section>
  );
}
