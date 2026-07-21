"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPanel, ShimmerCard } from "@/components/kpi-analytics/KpiSection";
import { fetchHubbleRedeemAnalytics } from "@/kpiAnalyticsApi";

const ENTRIES_OPTIONS = [10, 20, 50];

const CSV_COLUMNS = [
  { key: "userId", label: "User ID" },
  { key: "username", label: "Username" },
  { key: "name", label: "Full Name" },
  { key: "phoneNumber", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "redeemedTokens", label: "Redeemed Tokens" },
  { key: "availableHubbleBalance", label: "Available Hubble Balance" },
  { key: "redeemedAt", label: "Redeemed At" },
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNum(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
}

function UserAvatar({ name, id, src }) {
  const [imageError, setImageError] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const photoUrl = typeof src === "string" ? src.trim() : "";

  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  if (photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name} profile` : "Profile"}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5"
        onError={() => setImageError(true)}
      />
    );
  }

  const toneIndex = Math.abs(Number(String(id).replace(/\D/g, "")) || 0) % 6;
  const tones = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
  ];

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tones[toneIndex]}`}
    >
      {initial}
    </div>
  );
}

function csvEscape(val) {
  const str = val == null ? "" : String(val);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowsToCsv(rows) {
  const header = CSV_COLUMNS.map((col) => csvEscape(col.label)).join(",");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((col) => {
      if (col.key === "redeemedAt") return csvEscape(formatDate(row.redeemedAt));
      return csvEscape(row[col.key] ?? "");
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function HubbleAnalyticsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRedeemedTokens, setTotalRedeemedTokens] = useState(0);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchHubbleRedeemAnalytics({
        page,
        limit,
        sortBy: "redeemedAt",
        sortOrder: "DESC",
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setTotalRedeemedTokens(result.totalRedeemedTokens);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setTotalRedeemedTokens(0);
      setError(err?.message || err?.error || "Failed to load Hubble analytics");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

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
        row.email.toLowerCase().includes(q) ||
        row.phoneNumber.toLowerCase().includes(q) ||
        String(row.userId ?? "").includes(q)
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
    setPage(1);
  }, [limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleExportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const exportLimit = 100;
      const first = await fetchHubbleRedeemAnalytics({
        page: 1,
        limit: exportLimit,
        sortBy: "redeemedAt",
        sortOrder: "DESC",
      });
      let allRows = [...first.rows];

      for (let p = 2; p <= first.totalPages; p += 1) {
        const next = await fetchHubbleRedeemAnalytics({
          page: p,
          limit: exportLimit,
          sortBy: "redeemedAt",
          sortOrder: "DESC",
        });
        allRows = allRows.concat(next.rows);
      }

      if (!allRows.length) return;

      const csv = rowsToCsv(allRows);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `hubble-redeem-analytics_${date}.csv`);
    } catch (err) {
      setError(err?.message || err?.error || "Failed to export Hubble analytics");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
      <div className="space-y-4 border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Hubble Analytics</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Token redeem history from Hubble integration
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {loading ? "—" : `${total.toLocaleString()} redeems`}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || exporting || total === 0}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
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
            placeholder="Search name, username, email, phone, user ID…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 px-4 py-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => <ShimmerCard key={index} />)
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full bg-indigo-500/10" />
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total redeems
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatNum(total)}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full bg-violet-500/10" />
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Redeemed tokens
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatNum(totalRedeemedTokens)}
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : !filteredRows.length ? (
        <div className="p-6">
          <EmptyPanel
            title={search ? "No matches" : "No Hubble redeems"}
            description={
              search
                ? "Try a different search term."
                : "No Hubble token redeems found yet."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mobile
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Redeemed tokens
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Available balance
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Redeemed at
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={row.name} id={row.userId} src={row.profilePicUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{row.name}</p>
                        <p className="truncate text-xs text-slate-500">@{row.username}</p>
                        <p className="truncate text-xs text-slate-400">#{row.userId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.phoneNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{row.email}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-violet-600">
                    {formatNum(row.redeemedTokens)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-emerald-600">
                    {formatNum(row.availableHubbleBalance)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.redeemedAt)}</td>
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
