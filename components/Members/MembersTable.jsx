"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { normalizeMemberAvatarSrc } from "@/lib/memberAvatar";

const ENTRIES_OPTIONS = [10, 20, 50, 100];

function SortIcon() {
  return (
    <span className="ml-1 inline-flex flex-col text-indigo-400/80">
      <svg viewBox="0 0 24 24" className="h-3 w-3 -mb-0.5" fill="currentColor">
        <path d="M7 14l5-5 5 5H7z" />
      </svg>
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    </span>
  );
}

function Avatar({ src, name }) {
  const safeSrc = normalizeMemberAvatarSrc(src);

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
      {safeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeSrc}
          alt={name ?? ""}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-600">
          {name?.charAt(0) ?? "?"}
        </span>
      )}
    </div>
  );
}

export default function MembersTable({
  data = [],
  title = "Members",
  onEdit,
  onDelete,
  /** When set, pagination uses server totals and `data` is one page of rows */
  remoteTotal = null,
  page: serverPage,
  onPageChange,
  showSearch = false,
  onSearchChange,
  tableLoading = false,
  pageSize,
  onPageSizeChange,
}) {
  const [internalEntries, setInternalEntries] = useState(10);
  const entriesPerPage =
    pageSize !== undefined && pageSize !== null ? Number(pageSize) : internalEntries;
  const [internalPage, setInternalPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef(null);
  const router = useRouter();

  const isServer = remoteTotal != null && Number.isFinite(Number(remoteTotal));
  const totalItems = isServer ? Number(remoteTotal) : data.length;
  const currentPage = isServer ? Math.max(1, serverPage ?? 1) : internalPage;
  const setCurrentPage = (updater) => {
    const next =
      typeof updater === "function" ? updater(currentPage) : updater;
    const p = Math.max(1, next);
    if (isServer) onPageChange?.(p);
    else setInternalPage(p);
  };

  const totalPagesResolved =
    totalItems > 0 ? Math.ceil(totalItems / entriesPerPage) : null;
  const start = (currentPage - 1) * entriesPerPage;
  const pageData = useMemo(
    () => (isServer ? data : data.slice(start, start + entriesPerPage)),
    [data, start, entriesPerPage, isServer]
  );

  const canGoNext =
    totalItems > 0
      ? currentPage * entriesPerPage < totalItems
      : pageData.length === entriesPerPage;

  const visiblePages = useMemo(() => {
    const windowSize = 7;

    if (totalPagesResolved) {
      let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
      let endPage = Math.min(totalPagesResolved, startPage + windowSize - 1);
      startPage = Math.max(1, endPage - windowSize + 1);

      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    }

    let startPage = Math.max(1, currentPage - 3);
    let endPage = startPage + windowSize - 1;

    if (!canGoNext) {
      endPage = currentPage;
      startPage = Math.max(1, endPage - windowSize + 1);
    }

    if (currentPage < startPage) startPage = currentPage;
    if (currentPage > endPage) endPage = currentPage;

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [totalPagesResolved, currentPage, canGoNext]);

  const startIndex = pageData.length === 0 ? 0 : start + 1;
  const endIndex = start + pageData.length;

  useEffect(() => {
    if (!showSearch || typeof onSearchChange !== "function") return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(searchInput.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, showSearch, onSearchChange]);

  const toggleSelectAll = () => {
    if (selectedIds.size === pageData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageData.map((row) => row.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const allSelected = pageData.length > 0 && selectedIds.size === pageData.length;

  return (
    <div className="table-fade-in rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
      {/* Top: entries selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (onPageSizeChange) onPageSizeChange(n);
                else setInternalEntries(n);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
            >
              {ENTRIES_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-600">entries</span>
          </div>
          {showSearch && (
            <div className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-xs">
              <label htmlFor="members-search" className="sr-only">
                Search
              </label>
              <input
                id="members-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
        {tableLoading && (
          <span className="text-sm font-medium text-indigo-600">Loading…</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="border-b border-indigo-200/60 bg-indigo-50/80">
              <th className="px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">
                <span className="inline-flex items-center">Name {<SortIcon />}</span>
              </th>
              <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">
                <span className="inline-flex items-center">Contact {<SortIcon />}</span>
              </th>
              <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">
                <span className="inline-flex items-center">Email {<SortIcon />}</span>
              </th>
              <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">
                <span className="inline-flex items-center">Ingame name {<SortIcon />}</span>
              </th>
              <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">
                <span className="inline-flex items-center">Ingame Id {<SortIcon />}</span>
              </th>
              <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, index) => (
              <tr
                key={row.id}
                className="table-row-fade-up border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={row.avatar} name={row.name} />
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="text-sm text-slate-500">{row.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{row.contact}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{row.email}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{row.ingameName ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{row.ingameId ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => onEdit?.(row)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Edit"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(row)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalItems === 0 && !tableLoading && (
        <div className="px-4 py-12 text-center text-sm text-slate-500">
          No entries to show.
        </div>
      )}

      {/* Pagination (aligned with app/tracking/page.js) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm text-slate-600">
          {totalItems > 0 ? (
            <>
              Showing {startIndex} to {endIndex} of {totalItems} entries
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
            disabled={
              !canGoNext ||
              tableLoading ||
              (totalPagesResolved ? currentPage >= totalPagesResolved : false)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
