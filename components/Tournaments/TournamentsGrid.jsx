"use client";

import TournamentCard from "@/components/Tournaments/TournamentCard";

export default function TournamentsGrid({ tournaments, onSelect }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {tournaments.map((t) => (
        <div key={t.id} className="card-fade-up">
          <TournamentCard tournament={t} onClick={() => onSelect?.(t)} />
        </div>
      ))}
    </div>
  );
}

