"use client";

export default function SettingsPage() {
  return (
    <section className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-100/70 via-white to-violet-100/70 p-10 text-center shadow-[0_20px_60px_rgba(79,70,229,0.15)] backdrop-blur-sm">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 ring-1 ring-indigo-200">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M6.3 17.7l1.4-1.4" />
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-3 text-base text-slate-600 sm:text-lg">
          Feature coming soon. We are preparing something useful for you.
        </p>
      </div>
    </section>
  );
}
