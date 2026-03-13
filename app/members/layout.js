"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";

// Matches UserRoleType: ADMIN=1, PLAYER=2, ORGANIZER=3, ORGANIZER_TEAM=4, FREELANCER=5, SUPER_ADMIN=6
const TABS = [
  { label: "User", href: "/members/users" },
  { label: "Admin", href: "/members/admin" },
  { label: "Organizer", href: "/members/organizers" },
  { label: "Organizer Teams", href: "/members/organizer-teams" },
  { label: "Freelancer", href: "/members/freelancers" },
  { label: "Super Admin", href: "/members/super-admin" },
];

function getAddTitle(pathname) {
  if (pathname?.includes("/admin")) return "Add Admin";
  if (pathname?.includes("/organizers") && !pathname?.includes("organizer-teams")) return "Add Organizer";
  if (pathname?.includes("/organizer-teams")) return "Add Organizer Team";
  if (pathname?.includes("/freelancers")) return "Add Freelancer";
  if (pathname?.includes("/super-admin")) return "Add Super Admin";
  return "Add User";
}

export default function MembersLayout({ children }) {
  const pathname = usePathname();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddSubmit = (values) => {
    console.log("Add member", values);
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Tabs row: segment control + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
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
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddSubmit}
      />
    </div>
  );
}
