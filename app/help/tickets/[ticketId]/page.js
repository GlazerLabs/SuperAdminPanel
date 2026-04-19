"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { uploadImage } from "@/api";
import { fetchTicketMessages, isLikelyImageUrl, sendTicketMessage, updateTicketStatus } from "@/lib/supportApi";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PAGE_SIZE = 50;
/** Invisible placeholder so POST body keeps `text` when only an attachment is sent (sanitizePayload strips ""). */
const ATTACHMENT_ONLY_TEXT = "\u2060";

function mergeChronological(existing, incoming) {
  const map = new Map();
  for (const m of [...existing, ...incoming]) {
    map.set(m.id, m);
  }
  return Array.from(map.values()).sort((a, b) => {
    const t = (a.createdAtMs || 0) - (b.createdAtMs || 0);
    if (t !== 0) return t;
    return String(a.id).localeCompare(String(b.id));
  });
}

export default function TicketChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketIdParam = String(params?.ticketId || "");

  const userIdParam = searchParams.get("user_id");
  const userId = userIdParam != null && userIdParam !== "" ? Number(userIdParam) : NaN;

  const ticketIdNum = Number(ticketIdParam);

  const [messages, setMessages] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [nextOlderPage, setNextOlderPage] = useState(2);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const [draft, setDraft] = useState("");
  const [pendingAttachmentUrl, setPendingAttachmentUrl] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [statusValue, setStatusValue] = useState("in_progress");
  const [resolutionNote, setResolutionNote] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const topSentinelRef = useRef(null);
  const fileInputRef = useRef(null);
  const loadingOlderLock = useRef(false);
  const skipScrollToEndRef = useRef(false);
  const allowTopLoadRef = useRef(false);
  const olderFetchCooldownUntilRef = useRef(0);

  const canLoad = Number.isFinite(ticketIdNum) && ticketIdNum > 0 && Number.isFinite(userId) && userId > 0;

  const loadInitialMessages = useCallback(async () => {
    if (!canLoad) return;
    setLoadingInitial(true);
    setError(null);
    try {
      const { messages: rows, total, explicitTotal } = await fetchTicketMessages({
        ticket_id: ticketIdNum,
        user_id: userId,
        page: 1,
        limit: PAGE_SIZE,
      });
      const sorted = mergeChronological([], rows);
      setMessages(sorted);
      setTotalCount(total > 0 ? total : sorted.length);
      setNextOlderPage(2);
      if (!rows.length) {
        setHasMoreOlder(false);
      } else if (explicitTotal > 0) {
        setHasMoreOlder(sorted.length < explicitTotal);
      } else {
        setHasMoreOlder(rows.length >= PAGE_SIZE);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Ticket messages failed:", e);
      setError(e?.message || e?.error || "Failed to load messages");
      setMessages([]);
      setHasMoreOlder(false);
    } finally {
      setLoadingInitial(false);
    }
  }, [canLoad, ticketIdNum, userId]);

  useEffect(() => {
    if (!canLoad) {
      setLoadingInitial(false);
      return;
    }
    loadInitialMessages();
  }, [canLoad, loadInitialMessages]);

  /** Scroll to bottom after initial load or new message — not when prepending older. */
  useEffect(() => {
    if (loadingInitial || skipScrollToEndRef.current) {
      skipScrollToEndRef.current = false;
      return;
    }
    if (!messages.length) return;
    endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, loadingInitial]);

  const loadOlderMessages = useCallback(async () => {
    if (!canLoad || !hasMoreOlder || loadingOlderLock.current) return;
    const container = scrollRef.current;
    if (!container) return;

    loadingOlderLock.current = true;
    setLoadingOlder(true);
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    try {
      const { messages: rows, total, explicitTotal } = await fetchTicketMessages({
        ticket_id: ticketIdNum,
        user_id: userId,
        page: nextOlderPage,
        limit: PAGE_SIZE,
      });

      if (total > 0) setTotalCount(total);

      if (!rows.length) {
        setHasMoreOlder(false);
        return;
      }

      skipScrollToEndRef.current = true;
      setMessages((prev) => {
        const merged = mergeChronological(prev, rows);
        if (explicitTotal > 0) {
          setHasMoreOlder(merged.length < explicitTotal);
        } else {
          setHasMoreOlder(rows.length >= PAGE_SIZE);
        }
        return merged;
      });
      setNextOlderPage((p) => p + 1);

      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (!el) return;
        const nextHeight = el.scrollHeight;
        el.scrollTop = nextHeight - prevScrollHeight + prevScrollTop;
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Older messages failed:", e);
      setError(e?.message || e?.error || "Failed to load older messages");
    } finally {
      setLoadingOlder(false);
      loadingOlderLock.current = false;
      olderFetchCooldownUntilRef.current = Date.now() + 600;
    }
  }, [canLoad, hasMoreOlder, ticketIdNum, userId, nextOlderPage]);

  /** After first paint, allow “load older” so a full first page doesn’t auto-fire twice. */
  useEffect(() => {
    if (loadingInitial) return;
    const t = setTimeout(() => {
      allowTopLoadRef.current = true;
    }, 400);
    return () => clearTimeout(t);
  }, [loadingInitial]);

  /**
   * Load page 2+ when the top sentinel is near the viewport top (user scrolls up).
   * Root must be the viewport: the app shell (`layout.js`) scrolls the main column with `overflow-y-auto`,
   * not necessarily this page’s inner `scrollRef`, so `root: scrollRef` never fired for outer scroll.
   */
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || loadingInitial || !hasMoreOlder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (!hit || !allowTopLoadRef.current || loadingOlderLock.current) return;
        if (Date.now() < olderFetchCooldownUntilRef.current) return;
        loadOlderMessages();
      },
      { root: null, rootMargin: "120px 0px 120px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadingInitial, hasMoreOlder, loadOlderMessages, messages.length]);

  /** Backup when the inner message list is the element that scrolls (same thread, small outer scroll). */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loadingInitial || !hasMoreOlder) return;

    const onScroll = () => {
      if (!allowTopLoadRef.current || loadingOlderLock.current) return;
      if (Date.now() < olderFetchCooldownUntilRef.current) return;
      if (el.scrollTop < 80) loadOlderMessages();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadingInitial, hasMoreOlder, loadOlderMessages, messages.length]);

  const onPickAttachment = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canLoad) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const url = await uploadImage(file, "support");
      if (!url) throw new Error("Upload did not return a URL");
      setPendingAttachmentUrl(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Attachment upload failed:", err);
      setError(err?.message || "Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const sendAdminMessage = async () => {
    const text = draft.trim();
    if ((!text && !pendingAttachmentUrl) || !canLoad) return;
    setSending(true);
    setError(null);
    try {
      await sendTicketMessage({
        ticket_id: ticketIdNum,
        text: text || (pendingAttachmentUrl ? ATTACHMENT_ONLY_TEXT : ""),
        attachment_url: pendingAttachmentUrl || "",
      });
      setDraft("");
      setPendingAttachmentUrl(null);
      await loadInitialMessages();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Send message failed:", e);
      setError(e?.message || e?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const saveStatus = async () => {
    if (!canLoad) return;
    setStatusSaving(true);
    setError(null);
    try {
      await updateTicketStatus({
        ticket_id: ticketIdNum,
        status: statusValue,
        resolution_note: resolutionNote,
      });
      setResolutionNote("");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Update status failed:", e);
      setError(e?.message || e?.error || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  if (!canLoad) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#eef0fb] p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-indigo-100">
          <p className="text-slate-700">Missing ticket or user.</p>
          <p className="mt-2 text-sm text-slate-500">Open this chat from the inbox so user_id is included.</p>
          <Link href="/help/tickets" className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Back to tickets
          </Link>
        </div>
      </main>
    );
  }

  const displayUserLabel = `User #${userId}`;

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-[#eef0fb]">
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6">
        <Link href="/help/tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to tickets
        </Link>
        <p className="mt-2 text-base font-semibold text-slate-900">Ticket #{ticketIdNum} · Chat</p>
      </div>

      {error ? <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-800 sm:px-6">{error}</div> : null}

      <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 sm:px-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Update status</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex min-w-[160px] flex-col gap-1 text-sm">
            <span className="text-slate-500">Status</span>
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-500">Resolution note</span>
            <input
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Visible resolution summary"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={saveStatus}
            disabled={statusSaving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {statusSaving ? "Saving…" : "Save status"}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-3 sm:px-6"
      >
        <div ref={topSentinelRef} className="pointer-events-none h-2 w-full shrink-0" aria-hidden="true" />
        {loadingOlder ? (
          <div className="sticky top-0 z-10 flex justify-center py-2">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-md ring-1 ring-slate-200">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden="true" />
              Loading older messages…
            </div>
          </div>
        ) : null}

        {loadingInitial ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No messages in this thread yet.</p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender === "admin";
            const textBody = String(msg.text ?? "").trim();
            const att = msg.attachmentUrl || null;
            const hasText = textBody.length > 0 && textBody !== ATTACHMENT_ONLY_TEXT;
            const showEmptyOnly = !hasText && !att;
            const linkCls = isAdmin ? "text-indigo-100 underline hover:text-white" : "text-indigo-600 underline hover:text-indigo-800";
            return (
              <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[min(82%,42rem)] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    isAdmin ? "bg-indigo-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  <p className="text-xs font-semibold opacity-80">{isAdmin ? "Admin" : displayUserLabel}</p>
                  {att && isLikelyImageUrl(att) ? (
                    <a
                      href={att}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 block overflow-hidden rounded-lg ${isAdmin ? "ring-1 ring-white/40" : "ring-1 ring-slate-200"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={att} alt="" className="max-h-64 w-full object-contain" loading="lazy" />
                    </a>
                  ) : att ? (
                    <a href={att} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${linkCls}`}>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 3h7v7M10 14 21 3M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                      </svg>
                      Open attachment
                    </a>
                  ) : null}
                  {hasText ? (
                    <p className="mt-1.5 min-h-5 text-sm wrap-break-word">{textBody}</p>
                  ) : showEmptyOnly ? (
                    <p className="mt-1.5 text-sm italic opacity-70">(Empty message)</p>
                  ) : null}
                  <p className={`mt-1 text-right text-[11px] ${isAdmin ? "text-indigo-100" : "text-slate-400"}`}>{msg.time}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            tabIndex={-1}
            className="sr-only"
            onChange={onPickAttachment}
          />
          {pendingAttachmentUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              {isLikelyImageUrl(pendingAttachmentUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pendingAttachmentUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-medium text-slate-600">
                  FILE
                </div>
              )}
              <p className="min-w-0 flex-1 truncate text-xs text-slate-600">{pendingAttachmentUrl}</p>
              <button
                type="button"
                onClick={() => setPendingAttachmentUrl(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Remove
              </button>
            </div>
          ) : null}

          {/* Reference: input (flex) → attach → send; one bar, equal heights */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm ring-1 ring-slate-200/60">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendAdminMessage();
                }
              }}
              rows={1}
              placeholder="Type your reply… (Enter to send)"
              className="min-h-12 flex-1 resize-none rounded-lg border-0 bg-white px-3 py-3 text-sm leading-snug text-slate-900 placeholder:text-slate-400 outline-none ring-0 focus:ring-2 focus:ring-indigo-400/50"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment || sending}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              aria-label="Attach image or PDF"
            >
              {uploadingAttachment ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-400" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={sendAdminMessage}
              disabled={sending || uploadingAttachment || (!draft.trim() && !pendingAttachmentUrl)}
              className="inline-flex h-12 min-w-[5.5rem] shrink-0 items-center justify-center rounded-lg bg-indigo-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
