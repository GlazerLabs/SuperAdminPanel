"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTournamentAcquiredTeams,
  fetchTournamentAcquiredUsers,
  fetchTournamentAcquisitionSummary,
} from "@/api";
import { normalizeMemberAvatarSrc } from "@/lib/memberAvatar";

const ENTRIES_OPTIONS = [10, 20, 50, 100];

function formatNum(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
}

function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  // Backend often sends: "2026-08-04 10:10:52.186063+00"
  const normalized = raw
    .replace(" ", "T")
    .replace(/\+00$/, "Z")
    .replace(/(\.\d{3})\d+/, "$1");

  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDate(value) {
  if (!value) return "—";
  const date = parseApiDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Avatar({ src, name }) {
  const safeSrc = normalizeMemberAvatarSrc(src);
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
      {safeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeSrc} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-600">
          {name?.charAt(0)?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

function SummaryCard({ label, value, loading, format = "number" }) {
  const display =
    format === "rate"
      ? value == null || String(value).trim() === ""
        ? "—"
        : String(value)
      : formatNum(value);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100/70 bg-linear-to-br from-white via-indigo-50/40 to-violet-50/50 px-4 py-3 shadow-[0_8px_24px_rgba(79,70,229,0.10)] ring-1 ring-indigo-100/60">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-500/10" />
      <div className="relative text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="relative mt-1 text-xl font-bold text-slate-900">
        {loading ? (
          <span className="inline-block h-6 w-16 animate-pulse rounded bg-slate-200/80" />
        ) : (
          display
        )}
      </div>
    </div>
  );
}

function PaginationBar({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  loading,
}) {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const visiblePages = useMemo(() => {
    const windowSize = 5;
    let startPage = Math.max(1, page - Math.floor(windowSize / 2));
    let endPage = Math.min(totalPages, startPage + windowSize - 1);
    startPage = Math.max(1, endPage - windowSize + 1);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [page, totalPages]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
          >
            {ENTRIES_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>entries</span>
        </div>
        <span>
          Showing {start} to {end} of {formatNum(total)} entries
          {loading ? " · Loading…" : ""}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        {visiblePages.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold ${
              p === page
                ? "bg-indigo-600 text-white"
                : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (local.trim() === value.trim()) return;
      onChangeRef.current?.(local.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [local, value]);

  return (
    <input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = parseApiDate(value);
  if (!date) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleBadge({ role }) {
  if (!role) return <span className="text-sm text-slate-500">—</span>;
  const label = String(role);
  const lower = label.toLowerCase();
  const tone =
    lower.includes("lead") || lower.includes("captain")
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : lower.includes("sub")
        ? "bg-violet-50 text-violet-700 ring-violet-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tone}`}>
      {label}
    </span>
  );
}

function UsersTable({ rows, loading }) {
  if (!loading && rows.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No acquired users found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-indigo-200/60 bg-indigo-50/80">
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">User</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Contact</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Email</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Team</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Role</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Region</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Registered</th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-100">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                  </td>
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                >
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
                  <td className="px-4 py-3">
                    {row.teamName ? (
                      <div>
                        <p className="font-medium text-slate-900">{row.teamName}</p>
                        <p className="text-xs capitalize text-slate-500">
                          {row.teamType || (row.teamId != null ? `#${row.teamId}` : "")}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={row.roleInTeam} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.region || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatDateTime(row.registeredAt)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamsTable({ rows, loading }) {
  if (!loading && rows.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No acquired teams found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-indigo-200/60 bg-indigo-50/80">
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Team</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Code</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Type</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Owner</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Members</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Region</th>
            <th className="px-4 py-3 text-sm font-semibold text-indigo-900">Registered</th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-100">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                  </td>
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={null} name={row.teamName} />
                      <div>
                        <p className="font-semibold text-slate-900">{row.teamName}</p>
                        <p className="text-xs text-slate-500">#{row.teamId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-700">
                    {row.teamCode || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-slate-700">
                    {row.teamType || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {row.ownerName || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
                    {formatNum(row.memberCount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.region || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatDateTime(row.registeredAt)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TournamentAcquisitionPanel({ tournamentId }) {
  const [listTab, setListTab] = useState("users");
  const [summary, setSummary] = useState({
    acquiredUsers: 0,
    acquiredTeams: 0,
    totalRegisteredUsers: 0,
    totalRegisteredTeams: 0,
    userAcquisitionRate: "0%",
    teamAcquisitionRate: "0%",
    windowStart: null,
    windowEnd: null,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(20);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  const [teams, setTeams] = useState([]);
  const [teamsTotal, setTeamsTotal] = useState(0);
  const [teamsPage, setTeamsPage] = useState(1);
  const [teamsLimit, setTeamsLimit] = useState(20);
  const [teamsSearch, setTeamsSearch] = useState("");
  const [excludeSolo, setExcludeSolo] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState("");

  const id = String(tournamentId ?? "");

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const res = await fetchTournamentAcquisitionSummary(id);
        if (cancelled) return;
        setSummary({
          acquiredUsers: res.acquiredUsers,
          acquiredTeams: res.acquiredTeams,
          totalRegisteredUsers: res.totalRegisteredUsers,
          totalRegisteredTeams: res.totalRegisteredTeams,
          userAcquisitionRate: res.userAcquisitionRate,
          teamAcquisitionRate: res.teamAcquisitionRate,
          windowStart: res.windowStart,
          windowEnd: res.windowEnd,
        });
      } catch (err) {
        if (cancelled) return;
        setSummaryError(err?.message || err?.error || "Failed to load summary");
        setSummary({
          acquiredUsers: 0,
          acquiredTeams: 0,
          totalRegisteredUsers: 0,
          totalRegisteredTeams: 0,
          userAcquisitionRate: "0%",
          teamAcquisitionRate: "0%",
          windowStart: null,
          windowEnd: null,
        });
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadUsers = useCallback(async () => {
    if (!id) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await fetchTournamentAcquiredUsers({
        tournamentId: id,
        search: usersSearch,
        limit: usersLimit,
        page: usersPage,
      });
      setUsers(res.rows);
      setUsersTotal(res.total);
    } catch (err) {
      setUsers([]);
      setUsersTotal(0);
      setUsersError(err?.message || err?.error || "Failed to load acquired users");
    } finally {
      setUsersLoading(false);
    }
  }, [id, usersSearch, usersLimit, usersPage]);

  const loadTeams = useCallback(async () => {
    if (!id) return;
    setTeamsLoading(true);
    setTeamsError("");
    try {
      const res = await fetchTournamentAcquiredTeams({
        tournamentId: id,
        search: teamsSearch,
        limit: teamsLimit,
        page: teamsPage,
        excludeSolo,
      });
      setTeams(res.rows);
      setTeamsTotal(res.total);
    } catch (err) {
      setTeams([]);
      setTeamsTotal(0);
      setTeamsError(err?.message || err?.error || "Failed to load acquired teams");
    } finally {
      setTeamsLoading(false);
    }
  }, [id, teamsSearch, teamsLimit, teamsPage, excludeSolo]);

  useEffect(() => {
    if (listTab !== "users") return undefined;
    loadUsers();
  }, [listTab, loadUsers]);

  useEffect(() => {
    if (listTab !== "teams") return undefined;
    loadTeams();
  }, [listTab, loadTeams]);

  const summaryCards = [
    { label: "Acquired users", value: summary.acquiredUsers },
    { label: "Acquired teams", value: summary.acquiredTeams },
    { label: "Registered users", value: summary.totalRegisteredUsers },
    { label: "Registered teams", value: summary.totalRegisteredTeams },
    {
      label: "User acquisition rate",
      value: summary.userAcquisitionRate,
      format: "rate",
    },
    {
      label: "Team acquisition rate",
      value: summary.teamAcquisitionRate,
      format: "rate",
    },
  ];

  const windowLabel =
    summary.windowStart || summary.windowEnd
      ? `${formatDate(summary.windowStart)} → ${formatDate(summary.windowEnd)}`
      : null;

  return (
    <div className="space-y-5">
      {windowLabel ? (
        <p className="text-sm text-slate-600">
          Registration window:{" "}
          <span className="font-medium text-slate-800">{windowLabel}</span>
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            value={card.value}
            format={card.format}
            loading={summaryLoading}
          />
        ))}
      </section>

      {summaryError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {summaryError}
        </p>
      ) : null}

      <div className="rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setListTab("users")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                listTab === "users"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Acquired users
            </button>
            <button
              type="button"
              onClick={() => setListTab("teams")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                listTab === "teams"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Acquired teams
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {listTab === "teams" ? (
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={excludeSolo}
                  onChange={(e) => {
                    setExcludeSolo(e.target.checked);
                    setTeamsPage(1);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Exclude solo
              </label>
            ) : null}
            {listTab === "users" ? (
              <SearchInput
                value={usersSearch}
                onChange={(q) => {
                  setUsersSearch(q);
                  setUsersPage(1);
                }}
                placeholder="Search users…"
              />
            ) : (
              <SearchInput
                value={teamsSearch}
                onChange={(q) => {
                  setTeamsSearch(q);
                  setTeamsPage(1);
                }}
                placeholder="Search teams…"
              />
            )}
          </div>
        </div>

        <div className="p-4">
          {listTab === "users" ? (
            <>
              {usersError ? (
                <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {usersError}
                </p>
              ) : null}
              <UsersTable rows={users} loading={usersLoading} />
            </>
          ) : (
            <>
              {teamsError ? (
                <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {teamsError}
                </p>
              ) : null}
              <TeamsTable rows={teams} loading={teamsLoading} />
            </>
          )}
        </div>

        {listTab === "users" ? (
          <PaginationBar
            page={usersPage}
            limit={usersLimit}
            total={usersTotal}
            loading={usersLoading}
            onPageChange={setUsersPage}
            onLimitChange={(n) => {
              setUsersLimit(n);
              setUsersPage(1);
            }}
          />
        ) : (
          <PaginationBar
            page={teamsPage}
            limit={teamsLimit}
            total={teamsTotal}
            loading={teamsLoading}
            onPageChange={setTeamsPage}
            onLimitChange={(n) => {
              setTeamsLimit(n);
              setTeamsPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
