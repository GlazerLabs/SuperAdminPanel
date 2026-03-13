"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

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
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
      {src ? (
        <Image src={src} alt={name} fill sizes="36px" className="object-cover" />
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
}) {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const totalPages = Math.max(1, Math.ceil(data.length / entriesPerPage));
  const start = (currentPage - 1) * entriesPerPage;
  const pageData = useMemo(
    () => data.slice(start, start + entriesPerPage),
    [data, start, entriesPerPage]
  );

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
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
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

      {data.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-slate-500">
          No entries to show.
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm text-slate-600">
          Showing {data.length === 0 ? 0 : start + 1} to{" "}
          {Math.min(start + entriesPerPage, data.length)} of {data.length} entries
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setCurrentPage(p)}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
