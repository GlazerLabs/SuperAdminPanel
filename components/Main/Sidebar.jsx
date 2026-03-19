"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/zustand/auth";

const primaryNav = [
  { label: "Dashboard", href: "/", icon: "grid" },
  { label: "Members", href: "/members", icon: "org", matchPrefix: true },
  { label: "Role Management", href: "/roles", icon: "shield", matchPrefix: true },
  { label: "Tournaments", href: "/tournaments", icon: "trophy" },
  { label: "Lead Tracking", href: "/leads", icon: "activity", matchPrefix: true },
  { label: "Audit Logs", href: "/tracking", icon: "activity" },
];

const secondaryNav = [
  { label: "Setting", href: "/settings", icon: "settings" },
  { label: "Help Center", href: "/help", icon: "help" },
  { label: "Logout", icon: "logout", action: "logout" },
];

function NavIcon({ type, active }) {
  const base = `h-5 w-5 shrink-0 stroke-[2] ${active ? "stroke-indigo-400" : "stroke-slate-400"}`;

  switch (type) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "org":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <circle cx="7" cy="8" r="2.5" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M4.5 18c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
          <path d="M12.5 18c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <path d="M4 12h4l2 6 4-12 2 6h4" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
          <path d="M6 4H4v2a4 4 0 0 0 4 4" />
          <path d="M18 4h2v2a4 4 0 0 1-4 4" />
          <path d="M12 11v4" />
          <path d="M8 21h8" />
          <path d="M10 15h4" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <path d="M12 2L4 5v6.09a7 7 0 0 0 5 6.71 4 4 0 0 0 6 0 7 7 0 0 0 5-6.71V5L12 2z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M6.3 17.7l1.4-1.4" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M10.5 9.5a1.9 1.9 0 1 1 3 1.6c-.8.5-1.5 1-1.5 2" />
          <circle cx="12" cy="16" r="0.7" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" aria-hidden="true">
          <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
          <path d="M14 16l4-4-4-4" />
          <path d="M9 12h9" />
        </svg>
      );
    default:
      return null;
  }
}

function NavSection({ title, items, pathname, onLogout }) {
  return (
    <div className="mt-8">
      <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 space-y-0.5">
        {items.map((item) => {
          if (item.action === "logout") {
            return (
              <button
                key="logout"
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-red-200 transition-all hover:bg-red-500/10 hover:text-red-100"
              >
                <NavIcon type={item.icon} active={false} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          }

          const active = item.matchPrefix ? pathname?.startsWith(item.href) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all ${
                active
                  ? "bg-indigo-500/15 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <NavIcon type={item.icon} active={active} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="flex h-full flex-col bg-slate-900">
      <div className="flex flex-col items-center justify-center border-b border-white/10 px-4 py-7">
        <Image
          src="/Thryl Logo (1).svg"
          alt="THRYL"
          width={100}
          height={36}
          priority
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
        <NavSection title="Menu" items={primaryNav} pathname={pathname} />
        <NavSection
          title="Others"
          items={secondaryNav}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          Session secure
        </div>
        <p className="mt-1 text-xs text-slate-500">All admin actions are logged.</p>
      </div>
    </aside>
  );
}
