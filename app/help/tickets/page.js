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
  const [error, setError] = useState(null);

  const loadTickets = useCallback(async () => {
    if (!conversationId && !userId) {
      setTickets([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        category,
        ...(conversationId ? { conversation_id: Number(conversationId) } : {}),
        ...(userId ? { user_id: Number(userId) } : {}),
        ...(tournamentId ? { tournament_id: Number(tournamentId) } : {}),
      };
      const { tickets: rows } = await fetchSupportTickets(params);
      setTickets(rows);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Support tickets failed:", e);
      setError(e?.message || e?.error || "Failed to load tickets");
      setTickets([]);
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

  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
  };

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
    <main className="relative min-h-screen bg-[#eef0fb] pb-24">
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
            const unassigned = !t.assigneeName || t.assigneeName === "—";
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

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {unassigned ? (
                      <>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-400 ring-1 ring-rose-200/80">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12h16" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-500">Unassigned</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-violet-100 text-xs font-bold text-indigo-800">
                          {t.assigneeInitials}
                        </div>
                        <span className="truncate text-sm text-slate-600">{t.assigneeName}</span>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                      aria-label="Edit ticket"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 10.5-10.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete ticket"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 text-sm text-slate-500">
        <p>
          {loading ? "…" : `Showing ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
          {userEmail ? " (filtered by user)" : ""}
        </p>
        <p className="text-slate-400">Support API: GET /support/admin/tickets</p>
      </div>

      <button
        type="button"
        onClick={scrollDown}
        className="fixed bottom-8 left-1/2 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700"
        aria-label="Scroll down"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>
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
