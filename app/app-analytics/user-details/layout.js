"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const USER_DETAIL_TABS = [
  { href: "/app-analytics/user-details/dau", label: "DAU" },
  { href: "/app-analytics/user-details/wau", label: "WAU" },
  { href: "/app-analytics/user-details/mau", label: "MAU" },
];

export default function UserDetailsLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {USER_DETAIL_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
      {children}
    </div>
  );
}
