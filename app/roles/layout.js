"use client";

import { RolesProvider, useRoles } from "@/contexts/RolesContext";

function RolesLayoutInner({ children }) {
  const { roles, rolesMeta } = useRoles();
  const roleCount = rolesMeta?.total ?? roles.length;
  const totalUsers = rolesMeta?.totalUsers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{roleCount}</span>
          {roleCount === 1 ? " role" : " roles"}
          {totalUsers != null && (
            <>
              {" "}
              ·{" "}
              <span className="font-medium text-slate-700">
                {totalUsers.toLocaleString()}
              </span>{" "}
              users across all roles
            </>
          )}
          . Manage roles and their permissions. Click a card to view or add a new role.
        </p>
      </div>
      {children}
    </div>
  );
}

export default function RolesLayout({ children }) {
  return (
    <RolesProvider>
      <RolesLayoutInner>{children}</RolesLayoutInner>
    </RolesProvider>
  );
}
