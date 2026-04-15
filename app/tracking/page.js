"use client";

import { useEffect, useMemo, useState } from "react";
import { getApi } from "@/api";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const ENTRIES_OPTIONS = [10, 20, 50, 100];
const DEFAULT_MODULE_NAME = "tournament";
const ALL_MODULE_VALUE = "__all__";

const pickTimestamp = (row) =>
  row?.created_at || row?.createdAt || row?.updated_at || row?.updatedAt || row?.timestamp || null;

const pickActor = (row) =>
  row?.user_name || row?.userName || row?.admin_name || row?.adminName || row?.actor || row?.user || "—";

const pickAction = (row) => row?.action || row?.event || row?.activity || row?.operation || "—";

const pickModule = (row) => row?.module_name || row?.moduleName || row?.module || "—";

const pickDescription = (row) => row?.description || row?.message || row?.remarks || "—";

function formatDateTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString();
}

function getActionBadgeClass(action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized === "create" || normalized === "created") {
    return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (normalized === "delete" || normalized === "deleted") {
    return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  }
  if (normalized === "update" || normalized === "updated") {
    return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function normalizeModuleNameOptions(json) {
  const arr = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.result)
        ? json.result
        : [];

  const options = arr
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return { value: item, label: item };
      }
      if (typeof item === "object") {
        const value = item.module_name || item.name || item.value || item.key;
        const label = item.display_name || item.module_name || item.name || value;
        if (!value) return null;
        return { value: String(value), label: String(label ?? value) };
      }
      return null;
    })
    .filter(Boolean);

  return options;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_LIMIT);

  const [moduleOptions, setModuleOptions] = useState([]);
  const [selectedModuleName, setSelectedModuleName] = useState(ALL_MODULE_VALUE);
  const [moduleNamesLoading, setModuleNamesLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [totalCount, setTotalCount] = useState(0);
  const [canGoNext, setCanGoNext] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadModuleNames() {
      try {
        setModuleNamesLoading(true);
        const json = await getApi("audit/module-names");
        const options = normalizeModuleNameOptions(json);

        if (!isMounted) return;
        setModuleOptions(options);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load audit module names:", e);
      } finally {
        if (isMounted) setModuleNamesLoading(false);
      }
    }

    loadModuleNames();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(searchText.trim());
      setCurrentPage(DEFAULT_PAGE);
    }, 500);

    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: currentPage,
          limit: entriesPerPage,
          ...(selectedModuleName !== ALL_MODULE_VALUE ? { module_name: selectedModuleName } : {}),
          ...(appliedSearch ? { search: appliedSearch } : {}),
        };

        const json = await getApi("audit", params);

        const rows = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.result)
            ? json.result
            : Array.isArray(json?.logs)
              ? json.logs
              : [];

        const metaTotal =
          Number(json?.total) ||
          Number(json?.count) ||
          Number(json?.meta?.total) ||
          Number(json?.pagination?.total) ||
          Number(json?.data?.total) ||
          0;

        if (isMounted) {
          setLogs(rows);
          setTotalCount(metaTotal);
          setCanGoNext(metaTotal > 0 ? currentPage * entriesPerPage < metaTotal : rows.length === entriesPerPage);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load audit logs:", e);
        if (isMounted) setError(e?.message || "Failed to load audit logs");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLogs();
    return () => {
      isMounted = false;
    };
  }, [refreshSeed, currentPage, entriesPerPage, selectedModuleName, appliedSearch]);

  const totalLogs = totalCount || logs.length;
  const latestLogTime = useMemo(() => {
    if (!logs.length) return null;
    return pickTimestamp(logs[0]);
  }, [logs]);
  const startIndex = logs.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endIndex = (currentPage - 1) * entriesPerPage + logs.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / entriesPerPage) : null;
  const visiblePages = useMemo(() => {
    const windowSize = 7;

    if (totalPages) {
      // Known total: clamp window within [1..totalPages]
      let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
      let end = Math.min(totalPages, start + windowSize - 1);
      start = Math.max(1, end - windowSize + 1);

      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    // Unknown total: still shift the page buttons around the current page
    let start = Math.max(1, currentPage - 3);
    let end = start + windowSize - 1;

    // If we can't go further, shift window to end on currentPage
    if (!canGoNext) {
      end = currentPage;
      start = Math.max(1, end - windowSize + 1);
    }

    // Ensure the window includes currentPage (guard against edge math)
    if (currentPage < start) start = currentPage;
    if (currentPage > end) end = currentPage;

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, currentPage, canGoNext]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Activity Logs</h1>
          <p className="mt-1 text-slate-600">
            Showing module:{" "}
            <span className="font-semibold text-slate-800">
              {selectedModuleName === ALL_MODULE_VALUE
                ? "All"
                : moduleOptions.find((o) => o.value === selectedModuleName)?.label || selectedModuleName || DEFAULT_MODULE_NAME}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshSeed((s) => s + 1)}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Total logs fetched</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "—" : totalLogs}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Latest activity time</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{loading ? "—" : formatDateTime(latestLogTime)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {/* Top: entries selector */}
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Module</span>
            <select
              value={selectedModuleName}
              onChange={(e) => {
                setSelectedModuleName(e.target.value);
                setCurrentPage(1);
              }}
              disabled={moduleNamesLoading || moduleOptions.length === 0}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={ALL_MODULE_VALUE}>All</option>
              {moduleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex min-w-[260px] items-center gap-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by user name..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-indigo-200/60 bg-indigo-50/80">
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Date</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Time</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Created By</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Full Name</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Email</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Action</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Module</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={8}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-rose-600" colSpan={8}>
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={8}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) => (
                  <tr
                    key={row?.id || row?._id || `${pickTimestamp(row) || "ts"}-${idx}`}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDate(pickTimestamp(row))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatTime(pickTimestamp(row))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-800">
                      {row?.performed_by_username || row?.created_by_id || pickActor(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {row?.performed_by_full_name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {row?.performed_by_email || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getActionBadgeClass(pickAction(row))}`}>
                        {pickAction(row)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{pickModule(row)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row?.entity_id || "—"}</td>
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
              <>Showing {startIndex} to {endIndex}</>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            >
              Previous
            </button>
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                disabled={loading}
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
              disabled={!canGoNext || loading || (totalPages ? currentPage >= totalPages : false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
