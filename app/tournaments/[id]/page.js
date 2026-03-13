"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { tournamentsMock } from "@/data/tournamentsMockData";
import TournamentOrgChart from "@/components/Tournaments/TournamentOrgChart";

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function TournamentDetailsPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const tournament = tournamentsMock.find((t) => String(t.id) === id);

  if (!tournament) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </Link>
            <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
              {tournament.status}
            </span>
          </div>

          <h1 className="mt-4 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {tournament.title}
          </h1>
          <p className="mt-1 text-slate-600">
            {tournament.organizerName} • {tournament.game}
          </p>
        </div>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatPill label="Entry fee" value={tournament.entryFee} />
        <StatPill label="Slots" value={tournament.slots} />
        <StatPill label="Dates" value={tournament.dateLabel} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Hierarchy</h2>
            <p className="mt-1 text-sm text-slate-600">
              Org-chart view with name, avatar, and role.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            Scroll horizontally if needed
          </div>
        </div>

        <div className="mt-5">
          <TournamentOrgChart root={tournament.hierarchy} />
        </div>
      </section>
    </main>
  );
}

