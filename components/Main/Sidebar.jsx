"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const primaryNav = [
  { label: "Dashboard", href: "/", icon: "grid" },
  { label: "Users", href: "/users", icon: "org" },
  { label: "User Tracking", href: "/tracking", icon: "activity" },
];

const secondaryNav = [
  { label: "Setting", href: "/settings", icon: "settings" },
  { label: "Help Center", href: "/help", icon: "help" },
];

function NavIcon({ type }) {
  const base = "h-4 w-4 stroke-[1.6] stroke-zinc-300";

  switch (type) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "org":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <circle cx="7" cy="8" r="2.5" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M4.5 18c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
          <path d="M12.5 18c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
        </svg>
      );
    case "apps":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <path d="M5 7.5 12 3l7 4.5v9L12 21l-7-4.5z" />
          <path d="M12 3v18" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <path d="M12 3 6 5v6.5C6 15.8 8.2 18.6 12 21c3.8-2.4 6-5.2 6-9.5V5z" />
          <path d="M10 11.5 11.5 13 15 9.5" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <path d="M4 12h4l2 6 4-12 2 6h4" />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M16 10h3v4h-3a2 2 0 0 1-2-2c0-1.1.9-2 2-2Z" />
        </svg>
      );
    case "fraud":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <path d="M12 3 4 7v6c0 3.3 2.7 6.3 8 8 5.3-1.7 8-4.7 8-8V7z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="15.5" r="0.8" />
        </svg>
      );
    case "support":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <path d="M9 10a3 3 0 0 1 6 0c0 2-3 2-3 4" />
          <circle cx="12" cy="17" r="0.8" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M6.3 17.7l1.4-1.4" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 24 24" className={base} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M10.5 9.5a1.9 1.9 0 1 1 3 1.6c-.8.5-1.5 1-1.5 2" />
          <circle cx="12" cy="16" r="0.7" />
        </svg>
      );
    default:
      return null;
  }
}

function NavSection({ title, items, pathname }) {
  return (
    <div className="mt-5">
      <p className="px-5 text-[11px] font-semibold tracking-[0.14em] text-zinc-500">
        {title}
      </p>
      <div className="mt-2 space-y-1 px-2 text-sm">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-900/70 hover:text-white"
              }`}
            >
              <NavIcon type={item.icon} />
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col bg-[#050816] text-zinc-50">
      <div className="flex flex-col items-center justify-center px-4 py-6 border-b border-white/5">
        <Image
          src="/Thryl Logo (1).svg"
          alt="THRYL"
          width={96}
          height={32}
          priority
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-4 pt-1">
        <NavSection title="MENU" items={primaryNav} pathname={pathname} />
        <NavSection title="OTHERS" items={secondaryNav} pathname={pathname} />
      </div>

      <div className="border-t border-white/5 px-4 py-4 text-[11px] text-zinc-500">
        <div className="flex items-center justify-between">
          <span>Session secure</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-1 text-[10px] text-zinc-600">
          All admin actions are logged.
        </div>
      </div>
    </aside>
  );
}

