"use client";

function statusStyles(status) {
  switch (status) {
    case "Live":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-200/60";
    case "Upcoming":
      return "bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-200/60";
    case "Finished":
    default:
      return "bg-slate-500/10 text-slate-700 ring-1 ring-slate-200/70";
  }
}

function gameIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 12h12" />
      <path d="M12 6v12" />
      <path d="M7 19h10a3 3 0 0 0 3-3l-1-8a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3l-1 8a3 3 0 0 0 3 3Z" />
    </svg>
  );
}

function feeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v18" />
      <path d="M16 7H9.5a3.5 3.5 0 0 0 0 7H14a3 3 0 1 1 0 6H8" />
    </svg>
  );
}

function slotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="8" r="2.2" />
      <path d="M5 19c0-2 1.6-3.6 3.6-3.6S12.2 17 12.2 19" />
      <path d="M11.8 19c0-2 1.6-3.6 3.6-3.6S19 17 19 19" />
    </svg>
  );
}

export default function TournamentCard({ tournament, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-indigo-500/10" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 ring-1 ring-slate-200/70" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {tournament.organizerName}
                </div>
                <div className="text-xs text-slate-500">Organizer</div>
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles(
              tournament.status
            )}`}
          >
            {tournament.status}
          </span>
        </div>

        <div className="relative mt-4">
          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-slate-900">
            {tournament.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <div className="inline-flex items-center gap-2">
              {gameIcon()}
              <span className="font-medium">{tournament.game}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              {feeIcon()}
              <span className="font-medium">{tournament.entryFee}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              {slotsIcon()}
              <span className="font-medium">{tournament.slots}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500">{tournament.dateLabel}</div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
              View hierarchy
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

