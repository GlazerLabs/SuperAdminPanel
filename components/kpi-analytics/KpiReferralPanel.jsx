"use client";

import { useMemo, useState } from "react";
import { EmptyPanel } from "./KpiSection";

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 1000) return `${Math.round(num)}`;
  return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function UserAvatar({ name }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {initial}
    </div>
  );
}

function countDirectReferrals(nodes) {
  if (!Array.isArray(nodes)) return 0;
  return nodes.reduce((sum, node) => sum + 1 + countDirectReferrals(node.children), 0);
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
    <ul className="divide-y divide-slate-100">
      {flat.map((node) => {
        const isSelected = String(node.id) === String(selectedUserId);
        const isRoot = node.depth === 0;

        return (
          <li key={`${node.id}-${node.depth}`}>
            <button
              type="button"
              onClick={() => onSelect?.(node.id)}
              style={{ paddingLeft: `${12 + node.depth * 16}px` }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
              }`}
            >
              <UserAvatar name={node.name} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${isRoot ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
                  {node.name}
                </p>
                <p className="truncate text-xs text-slate-400">#{node.id}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                {formatCompact(node.referralCount)} refs
              </span>
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
  treeUserId,
  onTreeUserIdChange,
  onTreeSearch,
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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referralUsers;
    return referralUsers.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.referralCode.toLowerCase().includes(q) ||
        String(row.id).includes(q)
    );
  }, [referralUsers, search]);

  const treeMemberCount = useMemo(() => countDirectReferrals(referralTree), [referralTree]);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
      <div className="grid min-h-112 xl:grid-cols-2 xl:divide-x xl:divide-slate-200">
        {/* Users list */}
        <div className="flex flex-col">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Referrers</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {loading ? "—" : `${referralUsers.length} users · ${formatCompact(totalReferrals)} total referrals`}
                </p>
              </div>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, code…"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
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
                            ? "border-l-2 border-indigo-600 bg-indigo-50/80 pl-[14px]"
                            : "border-l-2 border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <UserAvatar name={row.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {row.email !== "—" ? row.email : `#${row.id}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatCompact(row.referralCount)}
                          </p>
                          <p className="text-[11px] text-slate-400">referrals</p>
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

        {/* Tree panel */}
        <div className="flex flex-col border-t border-slate-200 xl:border-t-0">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">Referral tree</h3>
                {selectedUser ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-800">{selectedUser.name}</span>
                    <span className="text-slate-300">·</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {selectedUser.referralCode}
                    </code>
                    <span className="text-slate-300">·</span>
                    <span>{formatCompact(selectedUser.referralCount)} direct</span>
                  </div>
                ) : selectedUserId ? (
                  <p className="mt-1 text-sm text-slate-500">User #{selectedUserId}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Select a referrer on the left</p>
                )}
              </div>
              <form onSubmit={onTreeSearch} className="flex shrink-0 items-center gap-2">
                <input
                  type="text"
                  value={treeUserId}
                  onChange={(e) => onTreeUserIdChange(e.target.value)}
                  placeholder="User ID"
                  className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Load
                </button>
              </form>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {treeError ? (
              <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {treeError}
              </div>
            ) : null}

            {treeLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : referralTree.length ? (
              <>
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {treeMemberCount} {treeMemberCount === 1 ? "member" : "members"} in tree
                  </p>
                </div>
                <ReferralTreeList
                  nodes={referralTree}
                  onSelect={onSelectUser}
                  selectedUserId={selectedUserId}
                />
              </>
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center p-6">
                <EmptyPanel
                  title="No tree loaded"
                  description="Click a referrer on the left or enter a user ID."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
