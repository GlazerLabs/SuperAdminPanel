"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembersAnalyticsList } from "@/hooks/useMembersAnalyticsList";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import { normalizeMemberAvatarSrc } from "@/lib/memberAvatar";

const DEFAULT_PAGE = 1;
const ENTRIES_OPTIONS = [10, 20, 50, 100];
const ANALYTICS_ROLE = "player";

function Avatar({ src, name }) {
  const safeSrc = normalizeMemberAvatarSrc(src);

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
      {safeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeSrc} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-600">
          {name?.charAt(0) ?? "?"}
        </span>
      )}
    </div>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const {
    data: logs,
    remoteTotal,
    page: currentPage,
    setPage: setCurrentPage,
    limit: entriesPerPage,
    setLimit: setEntriesPerPage,
    setSearch,
    stats,
    statsLoading,
    tableLoading,
    bump,
    totalDeltaPercent,
  } = useMembersAnalyticsList({
    analyticsRoleSlug: ANALYTICS_ROLE,
  });

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setCurrentPage(DEFAULT_PAGE);
    }, 500);

    return () => clearTimeout(t);
  }, [searchText, setSearch, setCurrentPage]);

  const totalCount = Number(remoteTotal) || 0;
  const canGoNext =
    totalCount > 0
      ? currentPage * entriesPerPage < totalCount
      : logs.length === entriesPerPage;

  const totalLogs = totalCount || logs.length;
  const startIndex = logs.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endIndex = (currentPage - 1) * entriesPerPage + logs.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / entriesPerPage) : null;

  const visiblePages = useMemo(() => {
    const windowSize = 7;

    if (totalPages) {
      let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
      let end = Math.min(totalPages, start + windowSize - 1);
      start = Math.max(1, end - windowSize + 1);

      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    let start = Math.max(1, currentPage - 3);
    let end = start + windowSize - 1;

    if (!canGoNext) {
      end = currentPage;
      start = Math.max(1, end - windowSize + 1);
    }

    if (currentPage < start) start = currentPage;
    if (currentPage > end) end = currentPage;

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, currentPage, canGoNext]);

  return (
    <>
      {statsLoading ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </section>
      ) : (
        <MembersStatsCards
          total={stats.total}
          lastWeek={stats.lastWeek}
          lastMonth={stats.lastMonth}
          label="Users"
          totalDeltaPercent={totalDeltaPercent}
        />
      )}

      <div className="mb-4 flex flex-wrap items-start justify-end gap-3">
        <button
          type="button"
          onClick={() => bump()}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                const next = Number(e.target.value);
                setEntriesPerPage(next);
                setCurrentPage(1);
              }}
              disabled={tableLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ENTRIES_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-600">entries</span>
          </div>

          <div className="ml-auto flex min-w-[260px] flex-1 items-center gap-2 sm:max-w-md">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, email, username…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-indigo-200/60 bg-indigo-50/80">
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Name</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Username</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Contact</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Email</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Ingame name</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Ingame Id</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={7}>
                    Loading members...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={7}>
                    No members found.
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) => (
                  <tr
                    key={row?.id || `${row?.email || "row"}-${idx}`}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={row.avatar} name={row.name} />
                        <span className="text-sm font-medium text-slate-800">{row.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.username}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.contact}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.ingameName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.ingameId ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/members/${encodeURIComponent(String(row.id))}/access?name=${encodeURIComponent(row.name ?? "")}`
                          )
                        }
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label="Module access"
                        title="Module access"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-sm text-slate-600">
            {totalCount > 0 ? (
              <>
                Showing {startIndex} to {endIndex} of {totalLogs} entries
              </>
            ) : (
              <>
                Showing {startIndex} to {endIndex}
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || tableLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                disabled={tableLoading}
                className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  p === currentPage
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!canGoNext || tableLoading || (totalPages ? currentPage >= totalPages : false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
