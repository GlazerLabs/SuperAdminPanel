"use client";

import Link from "next/link";
import { useRoles } from "@/contexts/RolesContext";

export default function RoleManagementCards() {
  const { roles } = useRoles();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {roles.map((role) => (
        <Link
          key={role.id}
          href={`/roles/${role.id}`}
          className="role-card-enter group block rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-all duration-200 hover:ring-indigo-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-900 truncate">
                {role.name}
              </h3>
              <p className="mt-2 text-3xl font-bold text-indigo-600 tabular-nums">
                {role.memberCount ?? 0}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 uppercase tracking-wider">members</p>
            </div>
            <span className="shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-400 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-600">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      ))}

      {/* Last card: Add New — adds new role (new route) */}
      <Link
        href="/roles/new"
        className="role-card-enter flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-slate-500 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="mt-3 text-sm font-semibold">Add New</span>
        <span className="mt-0.5 text-xs text-slate-400">New role</span>
      </Link>
    </div>
  );
}
