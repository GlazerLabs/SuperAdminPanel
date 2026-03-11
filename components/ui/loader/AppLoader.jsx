"use client";

export default function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-[#3399EF]" />
        <p className="text-sm text-zinc-400">Loading dashboard…</p>
      </div>
    </div>
  );
}

