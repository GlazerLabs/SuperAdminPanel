"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyPanel } from "./KpiSection";

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 1000) return `${Math.round(num)}`;
  return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

const AVATAR_TONES = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function toneFor(id) {
  const n = Math.abs(Number(String(id).replace(/\D/g, "")) || 0);
  return AVATAR_TONES[n % AVATAR_TONES.length];
}

function UserAvatar({ name, id, src, size = "md" }) {
  const [imageError, setImageError] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const sizeClass = size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";
  const photoUrl = typeof src === "string" ? src.trim() : "";

  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  if (photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name} profile` : "Profile"}
        className={`shrink-0 rounded-full object-cover ring-1 ring-black/5 ${sizeClass}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${toneFor(id)}`}
    >
      {initial}
    </div>
  );
}

function RankBadge({ rank }) {
  const styles =
    rank === 1
      ? "bg-amber-100 text-amber-700 ring-amber-200"
      : rank === 2
        ? "bg-slate-200 text-slate-700 ring-slate-300"
        : rank === 3
          ? "bg-orange-100 text-orange-700 ring-orange-200"
          : "bg-slate-50 text-slate-400 ring-slate-200";
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${styles}`}
    >
      {rank}
    </span>
  );
}

function countTreeMembers(nodes) {
  if (!Array.isArray(nodes)) return 0;
  return nodes.reduce((sum, node) => sum + 1 + countTreeMembers(node.children), 0);
}

function flattenTree(nodes, depth = 0, acc = []) {
  if (!Array.isArray(nodes)) return acc;
  for (const node of nodes) {
    acc.push({ ...node, depth });
    if (node.children?.length) flattenTree(node.children, depth + 1, acc);
  }
  return acc;
}

function ReferralTreeList({ nodes, onSelect, selectedUserId }) {
  const flat = useMemo(() => flattenTree(nodes), [nodes]);

  if (!flat.length) {
    return <EmptyPanel title="No referrals in tree" />;
  }

  return (
    <ul className="p-2">
      {flat.map((node) => {
        const isSelected = String(node.id) === String(selectedUserId);
        const isRoot = node.depth === 0;

        return (
          <li key={`${node.id}-${node.depth}`}>
            <button
              type="button"
              onClick={() => onSelect?.(node.id)}
              className={`flex w-full items-stretch gap-0 rounded-lg text-left transition ${
                isSelected ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"
              }`}
            >
              {Array.from({ length: node.depth }).map((_, i) => (
                <span key={i} className="ml-3 w-3 shrink-0 border-l border-dashed border-slate-200" />
              ))}
              <div className="flex flex-1 items-center gap-3 px-3 py-2.5">
                <UserAvatar name={node.name} id={node.id} src={node.profilePicUrl} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${isRoot ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}
                  >
                    {node.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {node.phone && node.phone !== "—" ? node.phone : "—"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                    node.referralCount > 0
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {formatCompact(node.referralCount)}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function KpiReferralPanel({
  loading,
  referralUsers,
  referralTree,
  selectedUserId,
  onSelectUser,
  treeLoading,
  treeError,
}) {
  const [search, setSearch] = useState("");

  const selectedUser = useMemo(
    () => referralUsers.find((u) => String(u.id) === String(selectedUserId)),
    [referralUsers, selectedUserId]
  );

  const totalReferrals = useMemo(
    () => referralUsers.reduce((sum, row) => sum + (Number(row.referralCount) || 0), 0),
    [referralUsers]
  );

  const rankedUsers = useMemo(
    () =>
      [...referralUsers]
        .map((row, idx) => ({ ...row, rank: idx + 1 }))
        .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
        .map((row, idx) => ({ ...row, rank: idx + 1 })),
    [referralUsers]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rankedUsers;
    return rankedUsers.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        String(row.phone || "").toLowerCase().includes(q) ||
        row.referralCode.toLowerCase().includes(q) ||
        String(row.id).includes(q)
    );
  }, [rankedUsers, search]);

  const treeMemberCount = useMemo(() => countTreeMembers(referralTree), [referralTree]);

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      {/* Referrers list */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 xl:col-span-2">
        <div className="space-y-3 border-b border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Top referrers</h3>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {loading ? "—" : `${formatCompact(totalReferrals)} referrals`}
            </span>
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
              placeholder="Search name, phone, code…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="max-h-128 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredUsers.length ? (
            <ul className="divide-y divide-slate-100">
              {filteredUsers.map((row) => {
                const isSelected = String(row.id) === String(selectedUserId);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelectUser(String(row.id))}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        isSelected
                          ? "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <RankBadge rank={row.rank} />
                      <UserAvatar name={row.name} id={row.id} src={row.profilePicUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {row.phone && row.phone !== "—" ? row.phone : "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-bold tabular-nums text-slate-900">
                          {formatCompact(row.referralCount)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">refs</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyPanel title={search ? "No matches" : "No referral users"} />
            </div>
          )}
        </div>
      </div>

      {/* Referral tree */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <h3 className="text-base font-semibold text-slate-900">Referral tree</h3>
        </div>

        {/* Selected user hero */}
        <div className="border-b border-slate-200 bg-linear-to-r from-indigo-50 to-white px-4 py-4">
          {selectedUser ? (
            <div className="flex items-center gap-4">
              <UserAvatar
                name={selectedUser.name}
                id={selectedUser.id}
                src={selectedUser.profilePicUrl}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-slate-900">{selectedUser.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {selectedUser.phone && selectedUser.phone !== "—"
                      ? selectedUser.phone
                      : "—"}
                  </span>
                  {selectedUser.referralCode && selectedUser.referralCode !== "—" ? (
                    <code className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200">
                      {selectedUser.referralCode}
                    </code>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-indigo-600">
                    {formatCompact(selectedUser.referralCount)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Direct</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">
                    {treeLoading ? "—" : formatCompact(Math.max(0, treeMemberCount - 1))}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Network</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a referrer to view their network.</p>
          )}
        </div>

        <div className="max-h-104 flex-1 overflow-y-auto">
          {treeError ? (
            <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {treeError}
            </div>
          ) : null}

          {treeLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : referralTree.length ? (
            <ReferralTreeList
              nodes={referralTree}
              onSelect={onSelectUser}
              selectedUserId={selectedUserId}
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center p-6">
              <EmptyPanel
                title="No tree loaded"
                description="Click a referrer or enter a user ID above."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
