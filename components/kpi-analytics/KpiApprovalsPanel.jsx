"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPanel, TabBar } from "@/components/kpi-analytics/KpiSection";
import { fetchKpiApprovalList, updateKpiApprovalStatus } from "@/kpiAnalyticsApi";

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "disapproved", label: "Disapproved" },
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

function formatGems(row) {
  const parts = [];
  if (row.gems != null) parts.push(`${row.gems.toLocaleString()} gems`);
  if (row.tokens != null) parts.push(`${row.tokens.toLocaleString()} tokens`);
  return parts.length ? parts.join(" · ") : "—";
}

function formatTarget(row) {
  if (row.targetPoints == null) return "—";
  return row.targetPoints.toLocaleString();
}

function isApprovedStatus(status) {
  return status === "approved" || status === "approve";
}

function isDisapprovedStatus(status) {
  return status === "disapproved" || status === "disapprove";
}

function StatusActions({ row, busy, onUpdate }) {
  const status = row.status || "pending";
  const showApprove = !isApprovedStatus(status);
  const showReject = !isDisapprovedStatus(status);

  if (!showApprove && !showReject) return null;

  return (
    <div className="flex justify-end gap-2">
      {showApprove ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate(row.id, "approve")}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Approve"}
        </button>
      ) : null}
      {showReject ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate(row.id, "disapprove")}
          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          Reject
        </button>
      ) : null}
    </div>
  );
}

function formatTypeLabel(row) {
  if (row.typeName && row.typeName !== "—") {
    return row.typeName.replace(/_/g, " ");
  }
  if (row.type != null && row.type !== "—") return `Type ${row.type}`;
  return "—";
}

function statusBadgeClass(status) {
  if (status === "approved" || status === "approve") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "disapproved" || status === "disapprove") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-800";
}

function formatStatusLabel(status) {
  if (!status) return "Pending";
  if (status === "approve") return "Approved";
  if (status === "disapprove") return "Disapproved";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function KpiApprovalsPanel() {
  const [activeStatus, setActiveStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchKpiApprovalList({
        page,
        limit,
        status: activeStatus,
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(result.totalPages ?? Math.max(1, Math.ceil(result.total / limit)));
    } catch (err) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError(err?.message || err?.error || "Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  }, [activeStatus, limit, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [activeStatus, limit]);

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const handleStatusUpdate = async (kpiId, status) => {
    setActionId(kpiId);
    setActionError("");
    try {
      await updateKpiApprovalStatus(kpiId, status);
      await loadRows();
    } catch (err) {
      setActionError(err?.message || err?.error || "Failed to update KPI status");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <TabBar tabs={STATUS_TABS} active={activeStatus} onChange={setActiveStatus} />

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
          <p className="text-sm font-medium text-slate-600">
            {loading ? "Loading…" : `${total} KPI${total === 1 ? "" : "s"}`}
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

        {loading ? (
          <div className="h-64 animate-pulse bg-slate-50" />
        ) : !rows.length ? (
          <div className="p-6">
            <EmptyPanel title="No KPIs found" description={`No ${activeStatus} KPIs right now.`} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Achievement
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gems
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Target
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
                {rows.map((row) => {
                  const busy = actionId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {row.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.imageUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-700">
                              {row.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{row.name}</p>
                            {row.userFacingGoal ? (
                              <p className="mt-0.5 text-xs text-slate-500">{row.userFacingGoal}</p>
                            ) : null}
                            <p className="mt-0.5 text-xs text-slate-400">#{row.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                          {formatTypeLabel(row)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                        {formatGems(row)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-800">{formatTarget(row)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.status || activeStatus)}`}
                        >
                          {formatStatusLabel(row.status || activeStatus)}
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

        {!loading && rows.length ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-sm text-slate-600">
              Showing {startIndex} to {endIndex} of {total} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  disabled={loading}
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
                disabled={page >= totalPages || loading}
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
