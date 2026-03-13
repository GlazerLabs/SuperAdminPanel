"use client";

export default function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-700">
      {/* Top progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-slate-200">
        <div
          className="h-full w-1/3 bg-indigo-500"
          style={{ animation: "app-loader-progress 1.2s ease-in-out infinite" }}
        />
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-transparent border-r-indigo-300 [animation-duration:0.8s]" />
        </div>
        <p className="text-sm font-medium text-slate-500">Loading dashboard…</p>
      </div>
    </div>
  );
}

