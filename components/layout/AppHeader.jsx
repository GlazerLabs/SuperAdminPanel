"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/zustand/auth";
import { readProfile } from "@/api";

const titleMap = {
  "/": "Dashboard",
  "/members": "Members",
  "/members/users": "Members",
  "/members/admin": "Members",
  "/members/organizers": "Members",
  "/members/organizer-teams": "Members",
  "/members/teams": "Members",
  "/members/freelancers": "Members",
  "/members/super-admin": "Members",
  "/tournaments": "Tournaments",
  "/tracking": "User Tracking",
};

export default function AppHeader() {
  const pathname = usePathname();
  const { token, user, loggedIn, setAuth } = useAuthStore();
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileIfNeeded() {
      if (!loggedIn || !token) return;

      // If we already have *any* stored user object (from login or persisted state),
      // don't spam the profile endpoint.
      if (user) return;

      setProfileLoading(true);
      try {
        const profileRes = await readProfile();
        const profile =
          profileRes?.profile ||
          profileRes?.data?.profile ||
          profileRes?.data?.user ||
          profileRes?.user ||
          profileRes?.data ||
          profileRes ||
          null;

        if (!cancelled && profile) {
          setAuth({ token, user: profile });
        }
      } catch (e) {
        // Non-fatal: header can still show a fallback.
        // eslint-disable-next-line no-console
        console.error("Failed to load profile in header:", e);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfileIfNeeded();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, token, user, setAuth]);

  const displayName = useMemo(() => {
    return (
      user?.name ||
      user?.full_name ||
      user?.username ||
      user?.email ||
      "Admin"
    );
  }, [user]);

  const roleLabel = useMemo(() => {
    return user?.role || user?.type || user?.userType || "Admin";
  }, [user]);

  const avatarUrl =
    typeof user?.avatar === "string"
      ? user.avatar
      : typeof user?.image === "string"
        ? user.image
        : typeof user?.avatar_url === "string"
          ? user.avatar_url
          : null;

  const title =
    titleMap[pathname] ??
    (pathname?.startsWith("/members")
      ? "Members"
      : pathname?.startsWith("/tournaments")
        ? "Tournaments"
        : "Dashboard");

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[1.8]" fill="none">
            <path d="M12 4a4 4 0 0 0-4 4v2.6c0 .5-.2 1-.5 1.4L6.3 14a1 1 0 0 0 .8 1.6h9.8a1 1 0 0 0 .8-1.6l-1.2-2a2.5 2.5 0 0 1-.5-1.4V8a4 4 0 0 0-4-4Z" />
            <path d="M10 16a2 2 0 0 0 4 0" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5 rounded-full bg-slate-50 pl-1.5 pr-3 py-1.5 ring-1 ring-slate-200/80">
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-slate-200">
            {avatarUrl ? (
              // Use <img> so we don't depend on Next/Image remote domains.
              <img
                src={avatarUrl}
                alt="Admin avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src="/avatar-placeholder.png"
                alt="Admin avatar"
                fill
                sizes="32px"
              />
            )}
          </div>
          <div className="hidden text-left md:block">
            <div className="text-sm font-medium text-slate-800">
              {profileLoading ? "Loading..." : displayName}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {roleLabel}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
