"use client";

import { useState } from "react";

function roleBadge(role) {
  const key = String(role || "").toLowerCase();
  if (key.includes("user")) return "bg-indigo-600/10 text-indigo-700 ring-1 ring-indigo-200/60";
  if (key.includes("organizer")) return "bg-violet-600/10 text-violet-700 ring-1 ring-violet-200/60";
  if (key.includes("team")) return "bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-200/60";
  if (key.includes("freelancer")) return "bg-amber-600/10 text-amber-700 ring-1 ring-amber-200/60";
  return "bg-slate-600/10 text-slate-700 ring-1 ring-slate-200/70";
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function avatarGradient(seed) {
  const n = Array.from(String(seed || "")).reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradients = [
    "from-indigo-500 to-violet-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-rose-500",
    "from-sky-500 to-indigo-500",
    "from-fuchsia-500 to-violet-500",
  ];
  return gradients[n % gradients.length];
}

export default function OrgChartNode({ node }) {
  const [imageError, setImageError] = useState(false);
  const role =
    node?.role ??
    (node?.type === "user"
      ? "User"
      : node?.type === "organizer"
        ? "Organizer"
        : node?.type === "team_member"
          ? "Team member"
          : node?.type === "freelancer"
            ? "Freelancer"
            : "Member");

  return (
    <div className="org-node group">
      <div className="relative overflow-hidden rounded-2xl bg-white px-5 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-indigo-600/10" />
        <div className="relative flex min-w-[260px] items-center gap-3.5">
          {node?.meta?.profile_pic_url && !imageError ? (
            <img
              src={node.meta.profile_pic_url}
              alt={node?.label ? `${node.label} profile` : "Profile"}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-black/5"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-br ${avatarGradient(
                node?.id ?? node?.label
              )} text-sm font-extrabold text-white ring-1 ring-black/5`}
              aria-hidden="true"
            >
              {initials(node?.label)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-slate-900">
              {node?.label ?? "Unknown"}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${roleBadge(role)}`}>
                {role}
              </span>
              {node?.meta?.handle ? (
                <span className="truncate text-xs text-slate-500">@{node.meta.handle}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

