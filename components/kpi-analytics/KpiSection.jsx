"use client";

export function SectionGroup({ label, children }) {
  if (!label) return <div className="space-y-4">{children}</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
      {children}
    </div>
  );
}

export function SectionCard({ title, subtitle, children, action, className = "" }) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 ${className}`}
    >
      {title || action ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyPanel({ title, description }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

export function ShimmerCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 animate-pulse">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active === tab.id
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ChangeBadge({ value }) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? "+" : "";
  const formatted = `${sign}${num}%`;
  const positive = num > 0;
  const negative = num < 0;

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive
          ? "bg-emerald-100 text-emerald-700"
          : negative
            ? "bg-rose-100 text-rose-700"
            : "bg-slate-100 text-slate-600"
      }`}
    >
      {formatted}
    </span>
  );
}
