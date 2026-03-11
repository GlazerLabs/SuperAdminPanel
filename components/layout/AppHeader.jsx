"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const titleMap = {
  "/": "Dashboard",
  "/users": "Users",
  "/tracking": "User Tracking",
};

export default function AppHeader() {
  const pathname = usePathname();
  const title = titleMap[pathname] || "Dashboard";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6">
      <h1 className="text-base font-semibold text-[#0099A4]">{title}</h1>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200"
          aria-label="Notifications"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 stroke-[1.8] stroke-black"
            fill="none"
          >
            <path d="M12 4a4 4 0 0 0-4 4v2.6c0 .5-.2 1-.5 1.4L6.3 14a1 1 0 0 0 .8 1.6h9.8a1 1 0 0 0 .8-1.6l-1.2-2a2.5 2.5 0 0 1-.5-1.4V8a4 4 0 0 0-4-4Z" />
            <path d="M10 16a2 2 0 0 0 4 0" />
          </svg>
        </button>

        <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-2.5 py-1.5">
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-zinc-300">
            <Image
              src="/avatar-placeholder.png"
              alt="Admin avatar"
              fill
              sizes="32px"
            />
          </div>
          <div className="mr-1 hidden text-xs md:block">
            <div className="font-medium text-zinc-800">Rahul Sharma</div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span>Admin</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

