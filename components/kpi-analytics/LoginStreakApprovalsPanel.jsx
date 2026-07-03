"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPanel, TabBar } from "@/components/kpi-analytics/KpiSection";
import {
  fetchLoginStreakRewards,
  updateLoginStreakRewardStatus,
} from "@/kpiAnalyticsApi";

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const ENTRIES_OPTIONS = [10, 20, 50];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeStatus(status) {
  if (status === "approve" || status === "approved") return "approved";
  if (status === "reject" || status === "rejected" || status === "disapproved") return "rejected";
  return "pending";
}

function statusBadgeClass(status) {
  const s = normalizeStatus(status);
  if (s === "approved") return "bg-emerald-100 text-emerald-700";
  if (s === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-800";
}

function formatStatusLabel(status) {
  const s = normalizeStatus(status);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatusActions({ row, busy, onUpdate }) {
  const status = normalizeStatus(row.status);
  const showApprove = status !== "approved";
  const showReject = status !== "rejected";

  if (!showApprove && !showReject) return null;

  return (
    <div className="flex justify-end gap-2">
      {showApprove ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate(row.id, "approved")}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Approve"}
        </button>
      ) : null}
      {showReject ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate(row.id, "rejected")}
          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          Reject
        </button>
      ) : null}
    </div>
  );
}

export default function LoginStreakApprovalsPanel() {
  const [activeStatus, setActiveStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchLoginStreakRewards();
      setRows(result.rows);
    } catch (err) {
      setRows([]);
      setError(err?.message || err?.error || "Failed to load login streak rewards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(
    () =>
      rows
        .filter((row) => normalizeStatus(row.status) === activeStatus)
        .sort((a, b) => (a.day ?? 0) - (b.day ?? 0)),
    [rows, activeStatus]
  );

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);
  const pageRows = useMemo(
    () => filteredRows.slice((page - 1) * limit, page * limit),
    [filteredRows, page, limit]
  );

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
    setPage(1);
  }, [activeStatus, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleStatusUpdate = async (rewardId, status) => {
    setActionId(rewardId);
    setActionError("");
    try {
      await updateLoginStreakRewardStatus([rewardId], status);
      await loadRows();
    } catch (err) {
      setActionError(err?.message || err?.error || "Failed to update reward status");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
          <TabBar tabs={STATUS_TABS} active={activeStatus} onChange={setActiveStatus} variant="chip" />
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-500">
              {loading ? "Loading…" : `${total} reward${total === 1 ? "" : "s"}`}
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
        </div>

        {loading ? (
          <div className="h-64 animate-pulse bg-slate-50" />
        ) : !filteredRows.length ? (
          <div className="p-6">
            <EmptyPanel
              title="No rewards found"
              description={`No ${activeStatus} login streak rewards right now.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Day
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Normal Token
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ad Token
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created by
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pageRows.map((row) => {
                  const busy = actionId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-700">
                            {row.day ?? "—"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">Day {row.day}</p>
                            <p className="mt-0.5 text-xs text-slate-400">#{row.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                        {row.normalGems != null ? row.normalGems.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                        {row.adGems != null ? row.adGems.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.createdByName || (row.createdById != null ? `#${row.createdById}` : "—")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusActions row={row} busy={busy} onUpdate={handleStatusUpdate} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredRows.length ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-sm text-slate-600">
              Showing {startIndex} to {endIndex} of {total} entries
            </p>
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
    </div>
  );
}
