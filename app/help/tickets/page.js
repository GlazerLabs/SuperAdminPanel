"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cardIconShellClass,
  cardPriorityClass,
  cardStatusPillClass,
  formatStatusLabel,
  statusDotClass,
} from "@/lib/helpSupportData";
import { fetchSupportTickets } from "@/lib/supportApi";

function ChatBubbleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 12a8 8 0 1 1-3.5-6.6L21 5v7Z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}

function TicketsCardsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const userEmail = searchParams.get("user");
  const conversationId = searchParams.get("conversation_id");
  const userId = searchParams.get("user_id");
  const tournamentId = searchParams.get("tournament_id");
  const category = searchParams.get("category") || "tournament";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const PAGE_SIZE = 20;
  const loadingMoreLock = useRef(false);
  const bottomSentinelRef = useRef(null);

  const loadTickets = useCallback(async () => {
    if (!conversationId && !userId) {
      setTickets([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setPage(1);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setPage(1);
    setHasMore(true);
    loadingMoreLock.current = false;
    try {
      const params = {
        category,
        ...(conversationId ? { conversation_id: Number(conversationId) } : {}),
        ...(userId ? { user_id: Number(userId) } : {}),
        ...(tournamentId ? { tournament_id: Number(tournamentId) } : {}),
        page: 1,
        limit: PAGE_SIZE,
      };
      const { tickets: rows, total } = await fetchSupportTickets(params);
      setTickets(rows);
      if (!rows.length) {
        setHasMore(false);
      } else if (total > 0) {
        setHasMore(rows.length < total);
      } else {
        setHasMore(rows.length >= PAGE_SIZE);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Support tickets failed:", e);
      setError(e?.message || e?.error || "Failed to load tickets");
      setTickets([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId, tournamentId, category]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const cardRefs = useRef({});

  useEffect(() => {
    if (!focusId) return;
    const el = cardRefs.current[focusId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, tickets]);
  const loadMoreTickets = useCallback(async () => {
    if (!conversationId && !userId) return;
    if (loading || !hasMore || loadingMoreLock.current) return;
    loadingMoreLock.current = true;
    setLoadingMore(true);
    setError(null);
    const nextPage = page + 1;
    try {
      const params = {
        category,
        ...(conversationId ? { conversation_id: Number(conversationId) } : {}),
        ...(userId ? { user_id: Number(userId) } : {}),
        ...(tournamentId ? { tournament_id: Number(tournamentId) } : {}),
        page: nextPage,
        limit: PAGE_SIZE,
      };
      const { tickets: rows, total } = await fetchSupportTickets(params);
      if (!rows.length) {
        setHasMore(false);
        return;
      }
      setTickets((prev) => {
        const map = new Map(prev.map((t) => [String(t.id), t]));
        let added = 0;
        for (const row of rows) {
          const key = String(row.id);
          if (!map.has(key)) {
            map.set(key, row);
            added += 1;
          }
        }
        // If backend repeats same data for next pages, stop further calls.
        if (added === 0) {
          setHasMore(false);
          return prev;
        }
        const merged = Array.from(map.values());
        if (total > 0) {
          setHasMore(merged.length < total);
        } else {
          setHasMore(rows.length >= PAGE_SIZE);
        }
        return merged;
      });
      setPage(nextPage);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Support tickets page fetch failed:", e);
      setError(e?.message || e?.error || "Failed to load more tickets");
    } finally {
      setLoadingMore(false);
      loadingMoreLock.current = false;
    }
  }, [category, conversationId, hasMore, loading, page, tournamentId, userId]);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel || loading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMoreTickets();
      },
      { root: null, rootMargin: "200px 0px 200px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreTickets, loading, hasMore, tickets.length]);

  const openChatRoute = (t) => {
    const tid = t.numericId ?? t.id;
    const uid = t.userId ?? (userId ? Number(userId) : null);
    const qs = new URLSearchParams();
    if (uid != null) qs.set("user_id", String(uid));
    qs.set("category", t.category || category);
    router.push(`/help/tickets/${tid}?${qs.toString()}`);
  };

  const hasContext = Boolean(conversationId || userId);

  const emptyMessage = useMemo(() => {
    if (!hasContext) return "Open a row from Help & Support inbox to load tickets for that conversation.";
    if (loading) return null;
    return "No tickets returned for this conversation.";
  }, [hasContext, loading]);

  return (
    <main className="relative min-h-screen bg-[#f5f7ff] pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to list
          </Link>
          <h1 className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Support tickets</h1>
          {conversationId ? (
            <p className="mt-1 text-sm text-slate-600">
              Conversation <span className="font-medium text-slate-800">#{conversationId}</span>
              {category ? (
                <>
                  {" "}
                  · <span className="capitalize">{category}</span>
                </>
              ) : null}
            </p>
          ) : null}
          {userEmail ? (
            <p className="mt-1 text-sm text-slate-600">
              Filtered by user: <span className="font-medium text-slate-800">{decodeURIComponent(userEmail)}</span>
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        {loading ? (
          <p className="col-span-full rounded-2xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm ring-1 ring-indigo-100/60">
            Loading tickets…
          </p>
        ) : tickets.length === 0 ? (
          <p className="col-span-full rounded-2xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm ring-1 ring-indigo-100/60">
            {emptyMessage}
          </p>
        ) : (
          tickets.map((t) => {
            const cardKey = String(t.id);
            return (
              <article
                key={cardKey}
                ref={(node) => {
                  cardRefs.current[cardKey] = node;
                }}
                id={`ticket-card-${cardKey}`}
                onClick={() => openChatRoute(t)}
                className={`cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 ring-white/80 ${
                  focusId === cardKey ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${cardIconShellClass(t.status)}`}
                    >
                      <ChatBubbleIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900">Ticket {t.ticketNo}</p>
                      <p className="text-sm text-indigo-600">
                        raised by <span className="font-medium">{t.raisedBy}</span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cardStatusPillClass(t.status)}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(t.status)}`} aria-hidden="true" />
                    {formatStatusLabel(t.status)}
                  </span>
                </div>

                <div className="space-y-3 border-b border-slate-100 px-4 py-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-400">Date</span>
                    <span className="font-medium text-slate-800">{t.dateLabel}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-400">Issue type</span>
                    <span className="text-right font-semibold text-slate-900">{t.issueType}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-400">Priority</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cardPriorityClass(t.priority)}`}
                    >
                      {t.priority}
                    </span>
                  </div>
                </div>

              </article>
            );
          })
        )}
      </div>
      {!loading && tickets.length > 0 ? (
        <div ref={bottomSentinelRef} className="flex min-h-10 items-center justify-center py-4">
          {loadingMore ? <span className="text-sm text-slate-500">Loading more tickets…</span> : null}
        </div>
      ) : null}

    </main>
  );
}

export default function SupportTicketsCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading tickets…</div>
      }
    >
      <TicketsCardsInner />
    </Suspense>
  );
}
