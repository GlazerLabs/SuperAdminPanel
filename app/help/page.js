"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  categoryBadgeClass,
  formatStatusLabel,
  priorityBadgeClass,
  statusBadgeClass,
} from "@/lib/helpSupportData";
import { fetchSupportInbox, SUPPORT_CATEGORIES } from "@/lib/supportApi";

const ENTRIES_OPTIONS = [10, 20, 50, 100];

const TICKET_TABS = [
  { id: "all", label: "All Tickets" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
  { id: "faq", label: "FAQ Manager" },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("open");
  const [categoryFilter, setCategoryFilter] = useState("tournament");
  const [entriesPerPage, setEntriesPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [inboxRows, setInboxRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFaqTab = activeTab === "faq";

  const loadInbox = useCallback(async () => {
    if (isFaqTab) return;
    setLoading(true);
    setError(null);
    try {
      const statusParam = activeTab === "all" ? undefined : activeTab;
      const { rows, total } = await fetchSupportInbox({
        category: categoryFilter,
        status: statusParam,
        page: currentPage,
        limit: entriesPerPage,
      });
      setInboxRows(rows);
      setTotalCount(total);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Support inbox failed:", e);
      setError(e?.message || e?.error || "Failed to load inbox");
      setInboxRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [isFaqTab, activeTab, categoryFilter, currentPage, entriesPerPage]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, categoryFilter, entriesPerPage]);

  const stats = useMemo(() => {
    const openUnresolved = inboxRows.filter((r) => r.status === "open").length;
    return {
      total: totalCount || inboxRows.length,
      openUnresolved,
      avgResponse: "—",
      totalDelta: "—",
      openToday: "—",
      responseDelta: "—",
    };
  }, [inboxRows, totalCount]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inboxRows;
    return inboxRows.filter(
      (t) =>
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.tournament.toLowerCase().includes(q) ||
        t.tournamentTag.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [inboxRows, search]);

  const allVisibleSelected =
    filteredTickets.length > 0 && filteredTickets.every((t) => selectedIds.has(t.id));
  const someSelected = filteredTickets.some((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      filteredTickets.forEach((t) => next.delete(t.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredTickets.forEach((t) => next.add(t.id));
      setSelectedIds(next);
    }
  };

  const toggleRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const openTicketCards = (row) => {
    const qs = new URLSearchParams();
    if (row.conversationId != null) qs.set("conversation_id", String(row.conversationId));
    if (row.userId != null) qs.set("user_id", String(row.userId));
    if (row.tournamentId != null) qs.set("tournament_id", String(row.tournamentId));
    qs.set("category", row.category || categoryFilter);
    router.push(`/help/tickets?${qs.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / entriesPerPage));

  return (
    <main className="min-h-screen bg-[#eef0fb] pb-10">
      {/* Status tabs */}
      <div className="rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-indigo-100/80">
        <div className="flex flex-wrap gap-1">
          {TICKET_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {!isFaqTab && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
          <div className="flex flex-wrap gap-2">
            {SUPPORT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ring-1 transition ${
                  categoryFilter === cat
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isFaqTab && (
        <div className="mt-5">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-violet-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-2" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Ticket
          </button>
        </div>
      )}

      {!isFaqTab && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-md shadow-indigo-100/40 ring-1 ring-white/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
                <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                <path d="M9 12h6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Total (inbox)</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{loading ? "—" : stats.total}</p>
            </div>
            <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {stats.totalDelta}
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-md shadow-indigo-100/40 ring-1 ring-white/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 3h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4V3Z" />
                <path d="M8 21h8v-3a4 4 0 0 0-4-4 4 4 0 0 0-4 4v3Z" />
                <path d="M12 10v4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Open (this page)</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{loading ? "—" : stats.openUnresolved}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {stats.openToday}
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-md shadow-indigo-100/40 ring-1 ring-white/80 sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Avg. Response Time</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{stats.avgResponse}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              {stats.responseDelta}
            </span>
          </div>
        </section>
      )}

      {isFaqTab ? (
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-indigo-100/60">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">FAQ Manager</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create and organize help articles. Connect your CMS or API when ready.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </div>
            <p className="max-w-md text-sm text-slate-600">
              No FAQs published yet. Use this space to add categories, questions, and answers for your users.
            </p>
            <button
              type="button"
              className="mt-2 rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25"
            >
              Add FAQ
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-indigo-100/60">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
              >
                {ENTRIES_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="relative min-w-[200px] flex-1 md:min-w-[280px]">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets, users, tournament..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadInbox()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-indigo-100 bg-[#f5f7ff]">
                  <th className="w-10 px-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allVisibleSelected && someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label="Select all visible tickets"
                    />
                  </th>
                  <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">User</th>
                  <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">Tournament</th>
                  <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">Category</th>
                  <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">Priority</th>
                  <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">Status</th>
                  <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={7}>
                      Loading inbox…
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      No tickets match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((row) => (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openTicketCards(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openTicketCards(row);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/40"
                      title="Open conversation tickets"
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          aria-label={`Select row ${row.id}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-800">
                            {row.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{row.userName}</p>
                            <p className="truncate text-xs text-slate-500">{row.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-slate-900">{row.tournament}</p>
                        <p className="text-xs text-slate-500">{row.tournamentTag}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${categoryBadgeClass(row.category)}`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClass(row.priority)}`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(row.status)}`}
                        >
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">{row.assigned}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <p>
              Page {currentPage} of {totalPages} · Showing {filteredTickets.length} row{filteredTickets.length === 1 ? "" : "s"}
              {activeTab !== "all" ? ` · status: ${TICKET_TABS.find((t) => t.id === activeTab)?.label}` : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
