"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPanel, ShimmerCard } from "@/components/kpi-analytics/KpiSection";
import { fetchLeaderboardWinners } from "@/kpiAnalyticsApi";
import { fetchGamesList } from "@/gameAnalyticsApi";

const SCOREBOARD_TYPE_LABELS = {
  total_points: "Total Points",
  top_score: "Top Score",
};

const ENTRIES_OPTIONS = [10, 20, 50];

function scoreboardTypeLabel(type) {
  const key = String(type ?? "").toLowerCase();
  return SCOREBOARD_TYPE_LABELS[key] || String(type ?? "—");
}

const DEFAULT_GAME_ID = "54";

function formatNum(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
}

function yesterdayYmd() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function RankBadge({ rank }) {
  const styles =
    rank === 1
      ? "bg-amber-100 text-amber-700 ring-amber-200"
      : rank === 2
        ? "bg-slate-200 text-slate-700 ring-slate-300"
        : rank === 3
          ? "bg-orange-100 text-orange-700 ring-orange-200"
          : "bg-slate-50 text-slate-400 ring-slate-200";
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${styles}`}
    >
      {rank}
    </span>
  );
}

export default function LeaderboardPanel() {
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState(DEFAULT_GAME_ID);
  const [scoreboardType, setScoreboardType] = useState("");
  const [leaderboardDate, setLeaderboardDate] = useState(yesterdayYmd());
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalToken, setTotalToken] = useState(0);
  const [gameName, setGameName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGamesLoading(true);
      try {
        const list = await fetchGamesList();
        if (cancelled) return;
        setGames(list);
        setSelectedGameId((current) => {
          if (current && list.some((game) => String(game.id) === String(current))) return current;
          const defaultGame = list.find((game) => String(game.id) === DEFAULT_GAME_ID);
          return defaultGame ? String(defaultGame.id) : list[0]?.id != null ? String(list[0].id) : "";
        });
      } catch {
        if (!cancelled) setGames([]);
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedGame = useMemo(
    () => games.find((item) => String(item.id) === String(selectedGameId)) || null,
    [games, selectedGameId]
  );

  const availableScoreboardTypes = useMemo(() => {
    const types = selectedGame?.scoreboardTypes;
    if (!Array.isArray(types) || !types.length) return [];
    return types.map((type) => ({
      id: String(type),
      label: scoreboardTypeLabel(type),
    }));
  }, [selectedGame]);

  useEffect(() => {
    if (!availableScoreboardTypes.length) {
      setScoreboardType("");
      return;
    }
    setScoreboardType((current) => {
      if (current && availableScoreboardTypes.some((type) => type.id === current)) {
        return current;
      }
      return availableScoreboardTypes[0].id;
    });
  }, [availableScoreboardTypes]);

  useEffect(() => {
    setPage(1);
  }, [selectedGameId, scoreboardType, leaderboardDate, limit]);

  const loadRows = useCallback(async () => {
    if (!selectedGameId || !leaderboardDate || !scoreboardType) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchLeaderboardWinners({
        customGameId: selectedGameId,
        scoreboardType,
        leaderboardDate,
        page,
        limit,
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setTotalToken(result.totalToken);
      setGameName(result.gameName);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setTotalToken(0);
      setGameName("");
      setError(err?.message || err?.error || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [selectedGameId, scoreboardType, leaderboardDate, page, limit]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.username.toLowerCase().includes(q) ||
        String(row.id ?? "").includes(q) ||
        String(row.rank ?? "").includes(q)
    );
  }, [rows, search]);

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectedGameLabel = useMemo(() => {
    if (gameName) return gameName;
    return selectedGame?.name || "—";
  }, [gameName, selectedGame]);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
      <div className="space-y-4 border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Leaderboard</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Daily winners by score for {selectedGameLabel}
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {loading ? "—" : `${total.toLocaleString()} winners`}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Game
            </span>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              disabled={gamesLoading || !games.length}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            >
              {gamesLoading ? <option value="">Loading games…</option> : null}
              {!gamesLoading && !games.length ? <option value="">No games found</option> : null}
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Scoreboard type
            </span>
            <select
              value={scoreboardType}
              onChange={(e) => setScoreboardType(e.target.value)}
              disabled={!availableScoreboardTypes.length}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            >
              {!availableScoreboardTypes.length ? (
                <option value="">No scoreboard types</option>
              ) : null}
              {availableScoreboardTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Leaderboard date
            </span>
            <input
              type="date"
              value={leaderboardDate}
              onChange={(e) => setLeaderboardDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-slate-400"
            fill="none"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username, user ID, rank…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 px-4 py-4 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <ShimmerCard key={index} />)
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full bg-indigo-500/10" />
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Winners</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatNum(total)}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full bg-amber-500/10" />
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Game</p>
              <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
                {selectedGameLabel}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full bg-emerald-500/10" />
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Reward tokens
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatNum(totalToken)}
              </p>
            </div>
          </>
        )}
      </div>

      {error ? (
        <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : !filteredRows.length ? (
        <div className="p-6">
          <EmptyPanel
            title={search ? "No matches" : "No leaderboard winners"}
            description={
              search
                ? "Try a different search term."
                : "No winners found for the selected game and date."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rank
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Game
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Points
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reward tokens
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={`${row.id}-${row.rank}`} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">@{row.username}</p>
                    <p className="text-xs text-slate-400">#{row.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.gameName || "—"}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-indigo-600">
                    {formatNum(row.points)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-emerald-600">
                    {formatNum(row.rewardTokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-slate-600">
              Showing {startIndex} to {endIndex} of {total.toLocaleString()} entries
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Show
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
              >
                {ENTRIES_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              entries
            </label>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  p === page
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
