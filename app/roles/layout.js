"use client";

import { RolesProvider } from "@/contexts/RolesContext";

function RolesLayoutInner({ children }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage roles and their permissions. Click a card to view or add a new role.
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
