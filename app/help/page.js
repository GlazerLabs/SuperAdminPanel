"use client";

export default function HelpCenterPage() {
  return (
    <section className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-100/70 via-white to-violet-100/70 p-10 text-center shadow-[0_20px_60px_rgba(79,70,229,0.15)] backdrop-blur-sm">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 ring-1 ring-indigo-200">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M10.5 9.5a1.9 1.9 0 1 1 3 1.6c-.8.5-1.5 1-1.5 2" />
            <circle cx="12" cy="16" r="0.7" />
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Help Center</h1>
        <p className="mt-3 text-base text-slate-600 sm:text-lg">
          Feature coming soon. We are preparing something useful for you.
        </p>
      </div>
    </section>
  );
}
