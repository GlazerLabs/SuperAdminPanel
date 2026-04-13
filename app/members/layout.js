"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import {
  MembersWorkspaceProvider,
  useMembersWorkspace,
} from "@/contexts/MembersWorkspaceContext";
import { MembersTabsProvider, useMembersTabs } from "@/contexts/MembersTabsContext";
import { getMembersPathCreateType } from "@/lib/membersRoleAnalytics";

function getAddTitle(pathname) {
  if (pathname?.includes("/admin")) return "Add Admin";
  if (pathname?.includes("/organizers") && !pathname?.includes("organizer-teams"))
    return "Add Organizer";
  if (pathname?.includes("/organizer-teams")) return "Add Organizer Team";
  if (pathname?.includes("/freelancers")) return "Add Freelancer";
  if (pathname?.includes("/super-admin")) return "Add Super Admin";
  if (pathname?.match(/^\/members\/role\/[^/]+$/)) return "Add member";
  return "Add User";
}

function getAddVariant(pathname) {
  if (pathname?.includes("/organizer-teams")) return "organizer";
  if (pathname?.includes("/organizers")) return "organizer";
  if (pathname?.match(/^\/members\/role\/[^/]+$/)) return "organizer";
  return "default";
}

function isMembersTabActive(pathname, tab) {
  if (!pathname || !tab?.href) return false;
  if (pathname === tab.href) return true;
  // `/members` shows the same list as the Player / "User" analytics tab
  if (pathname === "/members" && tab.analyticsSlug === "player") return true;
  return false;
}

function MembersLayoutInner({ children }) {
  const pathname = usePathname();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { submitAdd } = useMembersWorkspace();
  const { tabs } = useMembersTabs();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => {
            const active = isMembersTabActive(pathname, tab);
            return (
              <Link
                key={`${tab.roleCode}-${tab.href}`}
                href={tab.href}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </button>
      </div>

      {children}

      <AddEditMemberModal
        open={addModalOpen}
        title={getAddTitle(pathname)}
        variant={getAddVariant(pathname)}
        onClose={() => setAddModalOpen(false)}
        onSubmit={(values) =>
          submitAdd(values, { type: getMembersPathCreateType(pathname) })
        }
      />
    </div>
  );
}

function MembersLayoutShell({ children }) {
  return (
    <MembersTabsProvider>
      <MembersLayoutInner>{children}</MembersLayoutInner>
    </MembersTabsProvider>
  );
}

export default function MembersLayout({ children }) {
  return (
    <MembersWorkspaceProvider>
      <MembersLayoutShell>{children}</MembersLayoutShell>
    </MembersWorkspaceProvider>
  );
}
