"use client";

import TournamentHierarchyTree from "@/components/Tournaments/TournamentHierarchyTree";

export default function TournamentHierarchyDrawer({ open, tournament, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tournament hierarchy"
        className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tournament hierarchy
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">
              {tournament?.title ?? "Tournament"}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-600">
              {tournament?.organizerName ? `${tournament.organizerName} • ` : ""}
              {tournament?.game ?? ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <TournamentHierarchyTree root={tournament?.hierarchy} />
        </div>

        <div className="border-t border-slate-200/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}

