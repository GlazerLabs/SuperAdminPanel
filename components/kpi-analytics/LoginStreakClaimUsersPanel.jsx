"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPanel, ShimmerCard } from "@/components/kpi-analytics/KpiSection";
import { fetchLoginStreakClaimUsers } from "@/kpiAnalyticsApi";

const SUMMARY_CARDS = [
  { label: "Total users", key: "totalUsers", tone: "bg-indigo-500/10" },
  { label: "Normal token", key: "normalTotalToken", tone: "bg-sky-500/10" },
  { label: "Ad token", key: "adTotalToken", tone: "bg-violet-500/10" },
  { label: "Total token", key: "combinedTotalToken", tone: "bg-emerald-500/10" },
  { label: "Revenue", key: "revenue", tone: "bg-amber-500/10", format: "currency" },
];

const ADMOB_REVENUE_START_DATE = "2026-07-04";

const ENTRIES_OPTIONS = [10, 20, 50];

const CSV_COLUMNS = [
  { key: "id", label: "User ID" },
  { key: "username", label: "Username" },
  { key: "name", label: "Full Name" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "totalClaimDays", label: "Claim Days" },
  { key: "normalClaims", label: "Normal Claims" },
  { key: "adClaims", label: "Ad Claims" },
  { key: "normalToken", label: "Normal Token" },
  { key: "adToken", label: "Ad Token" },
  { key: "totalToken", label: "Total Token" },
  { key: "lastClaimAt", label: "Last Claim At" },
  { key: "lastClaimType", label: "Last Claim Type" },
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

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatSummaryValue(value, format) {
  if (format === "currency") return formatCurrency(value);
  return formatNum(value);
}

function todayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function claimTypeBadgeClass(type) {
  if (type === "ad") return "bg-violet-100 text-violet-700";
  if (type === "normal") return "bg-sky-100 text-sky-700";
  return "bg-slate-100 text-slate-600";
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
      if (col.key === "lastClaimAt") return csvEscape(formatDate(row.lastClaimAt));
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

export default function LoginStreakClaimUsersPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [normalTotalToken, setNormalTotalToken] = useState(0);
  const [adTotalToken, setAdTotalToken] = useState(0);
  const [revenue, setRevenue] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchLoginStreakClaimUsers({ page, limit });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setNormalTotalToken(result.normalTotalToken);
      setAdTotalToken(result.adTotalToken);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setNormalTotalToken(0);
      setAdTotalToken(0);
      setError(err?.message || err?.error || "Failed to load login streak data");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const endDate = todayYmd();
      const res = await fetch(
        `/api/analytics?startDate=${ADMOB_REVENUE_START_DATE}&endDate=${endDate}`
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to load AdMob revenue");
      }
      setRevenue(Number(json?.kpis?.estimatedEarnings ?? 0));
    } catch {
      setRevenue(null);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.username.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.mobile.toLowerCase().includes(q) ||
        String(row.id ?? "").includes(q)
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
      const first = await fetchLoginStreakClaimUsers({ page: 1, limit: exportLimit });
      let allRows = [...first.rows];

      for (let p = 2; p <= first.totalPages; p += 1) {
        const next = await fetchLoginStreakClaimUsers({ page: p, limit: exportLimit });
        allRows = allRows.concat(next.rows);
      }

      if (!allRows.length) return;

      const csv = rowsToCsv(allRows);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `login-streak-claim-users_${date}.csv`);
    } catch (err) {
      setError(err?.message || err?.error || "Failed to export login streak data");
    } finally {
      setExporting(false);
    }
  };

  const summaryValues = {
    totalUsers: total,
    normalTotalToken,
    adTotalToken,
    combinedTotalToken: normalTotalToken + adTotalToken,
    revenue,
  };

  const summaryLoading = loading || revenueLoading;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
      <div className="space-y-3 border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Login streak claims</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Users who have claimed login streak rewards
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {loading ? "—" : `${total.toLocaleString()} users`}
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
            placeholder="Search name, username, email, mobile, user ID…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryLoading
          ? SUMMARY_CARDS.map((card) => <ShimmerCard key={card.key} />)
          : SUMMARY_CARDS.map((card) => (
              <div
                key={card.key}
                className="relative overflow-hidden rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80"
              >
                <div
                  className={`absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full ${card.tone}`}
                />
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {formatSummaryValue(summaryValues[card.key], card.format)}
                </p>
              </div>
            ))}
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
            title={search ? "No matches" : "No login streak claims"}
            description={
              search
                ? "Try a different search term."
                : "No users have claimed login streak rewards yet."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
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
                  Claim days
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Normal
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ad
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total token
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last claim
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">@{row.username}</p>
                    <p className="text-xs text-slate-400">#{row.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.mobile}</td>
                  <td className="px-4 py-3 text-slate-600">{row.email}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-indigo-600">
                    {formatNum(row.totalClaimDays)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="tabular-nums text-slate-700">
                      {formatNum(row.normalClaims)} claims
                    </p>
                    <p className="text-xs tabular-nums text-slate-400">
                      {formatNum(row.normalToken)} token
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="tabular-nums text-slate-700">{formatNum(row.adClaims)} claims</p>
                    <p className="text-xs tabular-nums text-slate-400">
                      {formatNum(row.adToken)} token
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                    {formatNum(row.totalToken)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600">{formatDate(row.lastClaimAt)}</p>
                    {row.lastClaimType !== "—" ? (
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${claimTypeBadgeClass(row.lastClaimType)}`}
                      >
                        {row.lastClaimType}
                      </span>
                    ) : null}
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
