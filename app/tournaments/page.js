"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TournamentsGrid from "@/components/Tournaments/TournamentsGrid";
import { getApi } from "@/api";

const PAGE_SIZE = 10;

function toStatusLabel(status) {
  const s = String(status ?? "").toLowerCase().trim();
  if (!s) return "Upcoming";
  if (["live", "ongoing", "in_progress", "running", "active"].includes(s)) return "Live";
  if (["registration_closed", "registration", "upcoming", "scheduled", "draft"].includes(s)) return "Upcoming";
  if (["finished", "completed", "closed", "ended"].includes(s)) return "Finished";
  return "Upcoming";
}

function formatRange(start, end) {
  if (!start && !end) return "Date not available";
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const startValid = startDate && !Number.isNaN(startDate.getTime());
  const endValid = endDate && !Number.isNaN(endDate.getTime());
  if (!startValid && !endValid) return "Date not available";
  const a = startValid ? startDate : endDate;
  const b = endValid ? endDate : startDate;
  const sameDay =
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
  return sameDay ? fmt(a) : `${fmt(a)} - ${fmt(b)}`;
}

function extractList(json) {
  if (Array.isArray(json)) return json;
  const data = json?.data ?? json?.result ?? json?.payload;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.tournaments)) return data.tournaments;
  }
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.tournaments)) return json.tournaments;
  return [];
}

function pickTotal(json) {
  const meta = json?.meta ?? json?.pagination ?? json?.data?.meta ?? json?.data?.pagination ?? {};
  const total =
    Number(meta.total) ||
    Number(meta.total_count) ||
    Number(meta.totalCount) ||
    Number(meta.total_tournament) ||
    Number(meta.totalTournament) ||
    Number(json?.total) ||
    Number(json?.count) ||
    Number(json?.data?.total) ||
    Number(json?.data?.total_count) ||
    Number(json?.result?.total) ||
    0;
  return Number.isFinite(total) && total > 0 ? total : 0;
}

function pickMetaCounts(json) {
  const meta = json?.meta ?? json?.pagination ?? json?.data?.meta ?? json?.data?.pagination ?? {};
  return {
    totalTournament: Number(meta.total_tournament ?? meta.totalTournament ?? meta.total ?? 0) || 0,
    totalOngoing: Number(meta.total_ongoing ?? meta.totalOngoing ?? 0) || 0,
    totalFinished: Number(meta.total_finished ?? meta.totalFinished ?? 0) || 0,
  };
}

function mapTournamentRow(raw, index) {
  const id = raw?.id ?? raw?.tournament_id ?? raw?._id ?? `row-${index}-${Date.now()}`;
  const startAt = raw?.start_at ?? raw?.startAt ?? raw?.start_date ?? raw?.startDate ?? null;
  const endAt = raw?.end_at ?? raw?.endAt ?? raw?.end_date ?? raw?.endDate ?? startAt;
  const entryFeeValue = raw?.registration_fee ?? raw?.entry_fee ?? raw?.entryFee ?? raw?.fee ?? raw?.price;
  const isFree = Number(entryFeeValue) === 0 || String(entryFeeValue ?? "").toLowerCase() === "free";
  const slots =
    raw?.participant_count ??
    raw?.slots ??
    raw?.total_slots ??
    raw?.participant_limit ??
    raw?.max_participants ??
    0;

  return {
    id: String(id),
    organizerName: String(
      raw?.organization_name ?? raw?.organizer_name ?? raw?.organizerName ?? raw?.organizer?.name ?? "Organizer"
    ),
    status: toStatusLabel(raw?.status ?? raw?.tournament_status),
    title: String(raw?.title ?? raw?.name ?? raw?.tournament_name ?? raw?.tournamentName ?? `Tournament ${id}`),
    game: String(raw?.game_name ?? raw?.game ?? raw?.gameType ?? raw?.category ?? "Game"),
    entryFee: isFree ? "Free" : `₹${Number(entryFeeValue) || 0}`,
    slots: Number(slots) || 0,
    startAt,
    endAt,
    dateLabel: formatRange(startAt, endAt),
    hierarchy: null,
  };
}

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [metaCounts, setMetaCounts] = useState({
    totalTournament: 0,
    totalOngoing: 0,
    totalFinished: 0,
  });
  const loadingLockRef = useRef(false);
  const sentinelRef = useRef(null);

  const requestPage = useCallback(
    async (nextPage, titleFilter) => {
      const json = await getApi("tournament", {
        limit: PAGE_SIZE,
        page: nextPage,
        ...(titleFilter ? { title: titleFilter } : {}),
      });
      const rows = extractList(json).map((row, idx) => mapTournamentRow(row, idx));
      const total = pickTotal(json);
      const counts = pickMetaCounts(json);
      return { rows, total, counts };
    },
    []
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError("");
    setPage(1);
    setHasMore(true);
    loadingLockRef.current = false;
    try {
      const { rows, total, counts } = await requestPage(1, searchTitle);
      setTournaments(rows);
      setMetaCounts(counts);
      if (!rows.length) {
        setHasMore(false);
      } else if (total > 0) {
        setHasMore(rows.length < total);
      } else {
        setHasMore(rows.length >= PAGE_SIZE);
      }
    } catch (e) {
      setError(e?.message || "Failed to load tournaments");
      setTournaments([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [requestPage, searchTitle]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || loadingLockRef.current) return;
    loadingLockRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { rows, total, counts } = await requestPage(nextPage, searchTitle);
      setMetaCounts(counts);
      if (!rows.length) {
        setHasMore(false);
        return;
      }
      setTournaments((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const append = rows.filter((x) => !seen.has(x.id));
        if (!append.length) {
          setHasMore(false);
          return prev;
        }
        const merged = [...prev, ...append];
        if (total > 0) {
          setHasMore(merged.length < total);
        } else {
          setHasMore(rows.length >= PAGE_SIZE);
        }
        return merged;
      });
      setPage(nextPage);
    } catch (e) {
      setError(e?.message || "Failed to load more tournaments");
    } finally {
      setLoadingMore(false);
      loadingLockRef.current = false;
    }
  }, [hasMore, loading, loadingMore, page, requestPage, searchTitle]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTitle(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: null, rootMargin: "220px 0px 220px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, tournaments.length]);

  const onSelect = (t) => {
    const qs = new URLSearchParams();
    if (t?.title) qs.set("name", t.title);
    router.push(`/tournaments/${t.id}?${qs.toString()}`);
  };
  const visibleLabel = useMemo(() => `${tournaments.length} loaded`, [tournaments.length]);

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
        <div className="mb-4">
          <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 ring-1 ring-slate-200">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tournament..."
              className="w-full border-none bg-transparent p-0 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-indigo-50 px-4 py-7 ring-1 ring-indigo-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(79,70,229,0.12)]">
            <div className="absolute -right-3 -top-3 rounded-full bg-indigo-100 p-2 text-indigo-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" />
              </svg>
              Total tournaments
            </div>
            <div className="mt-3 text-2xl font-bold text-indigo-900">{metaCounts.totalTournament}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-emerald-50 px-4 py-7 ring-1 ring-emerald-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(16,185,129,0.16)]">
            <div className="absolute -right-3 -top-3 rounded-full bg-emerald-100 p-2 text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              Ongoing
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-900">{metaCounts.totalOngoing}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-slate-100 px-4 py-7 ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
            <div className="absolute -right-3 -top-3 rounded-full bg-slate-200 p-2 text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Finished
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{metaCounts.totalFinished}</div>
          </div>
        </div>

        <div className="mt-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          ) : null}
          {loading ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Loading tournaments...</p>
          ) : tournaments.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No tournaments found.</p>
          ) : (
            <>
              <TournamentsGrid tournaments={tournaments} onSelect={onSelect} />
              <div ref={sentinelRef} className="mt-4 flex min-h-10 items-center justify-center">
                <span className="mr-3 text-xs text-slate-400">{visibleLabel}</span>
                {loadingMore ? <span className="text-sm text-slate-500">Loading more tournaments...</span> : null}
                {!hasMore ? <span className="text-xs text-slate-400">You have reached the end.</span> : null}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

