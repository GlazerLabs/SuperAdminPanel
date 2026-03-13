"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { tournamentsMock } from "@/data/tournamentsMockData";
import TournamentsGrid from "@/components/Tournaments/TournamentsGrid";

export default function TournamentsPage() {
  const router = useRouter();
  const tournaments = useMemo(() => tournamentsMock, []);
  const onSelect = (t) => router.push(`/tournaments/${t.id}`);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Tournaments
        </h1>
        <p className="mt-1 text-slate-600">
          Browse tournaments and open the organizer/team hierarchy per card.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
              {tournaments.length} tournaments
            </span>
            <span className="text-sm text-slate-500">Mock list (ready for API)</span>
          </div>
        </div>

        <div className="mt-5">
          <TournamentsGrid tournaments={tournaments} onSelect={onSelect} />
        </div>
      </section>
    </main>
  );
}

