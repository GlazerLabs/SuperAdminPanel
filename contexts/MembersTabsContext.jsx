"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  analyticsSlugFromRoleName,
  displayLabelForRole,
  fetchRolesListForMembersCached,
  membersHrefForRole,
  parseRolesListResponse,
} from "@/lib/membersRoleAnalytics";

/** When `GET role` fails or is empty */
const FALLBACK_TABS = [
  {
    href: "/members/users",
    label: "User",
    roleCode: 2,
    analyticsSlug: "player",
  },
  {
    href: "/members/admin",
    label: "Admin",
    roleCode: 1,
    analyticsSlug: "admin",
  },
  {
    href: "/members/organizers",
    label: "Organizer",
    roleCode: 3,
    analyticsSlug: "organizer",
  },
  {
    href: "/members/organizer-teams",
    label: "Organizer Teams",
    roleCode: 4,
    analyticsSlug: "organizer_team",
  },
  {
    href: "/members/freelancers",
    label: "Freelancer",
    roleCode: 5,
    analyticsSlug: "freelancer",
  },
  {
    href: "/members/super-admin",
    label: "Super Admin",
    roleCode: 6,
    analyticsSlug: "super_admin",
  },
];

const MembersTabsContext = createContext(null);

/** Tab order aligned with product UI (User first, then Admin, …); extra roles after. */
const TAB_NAME_ORDER = [
  "PLAYER",
  "ADMIN",
  "ORGANIZER",
  "ORGANIZER_TEAM",
  "FREELANCER",
  "SUPER_ADMIN",
];

function tabSortRank(role) {
  const name = String(role?.name ?? "").trim().toUpperCase();
  const idx = TAB_NAME_ORDER.indexOf(name);
  if (idx !== -1) return idx;
  return 100 + Number(role?.role_code ?? role?.roleCode ?? 0);
}

function normalizeRoleRows(list) {
  return [...list]
    .filter((r) => r && r.is_deleted == null && Number(r?.is_active) !== 0)
    .sort((a, b) => tabSortRank(a) - tabSortRank(b) || Number(a.role_code) - Number(b.role_code));
}

export function MembersTabsProvider({ children }) {
  const [rolesList, setRolesList] = useState([]);
  const [tabs, setTabs] = useState(FALLBACK_TABS);
  const [userCounts, setUserCounts] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetchRolesListForMembersCached();
        if (cancelled) return;
        const nested = Array.isArray(res?.data) ? res.data[0] : null;
        const raw = parseRolesListResponse(res);
        const sorted = normalizeRoleRows(raw);
        if (sorted.length === 0) {
          setTabs(FALLBACK_TABS);
          setRolesList([]);
          setUserCounts(nested?.userCounts ?? null);
          setLoadError(false);
        } else {
          setRolesList(sorted);
          setUserCounts(nested?.userCounts ?? null);
          setLoadError(false);
          setTabs(
            sorted.map((role) => ({
              href: membersHrefForRole(role),
              label: displayLabelForRole(role),
              roleCode: Number(role.role_code ?? role.roleCode),
              analyticsSlug: analyticsSlugFromRoleName(role.name),
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setTabs(FALLBACK_TABS);
          setRolesList([]);
        }
      } finally {
        if (!cancelled) setRolesLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getAnalyticsSlugForRoleCode = useCallback((roleCode) => {
    const code = Number(roleCode);
    const role = rolesList.find(
      (r) => Number(r?.role_code ?? r?.roleCode) === code
    );
    if (role) return analyticsSlugFromRoleName(role.name);
    return null;
  }, [rolesList]);

  const value = useMemo(
    () => ({
      tabs,
      rolesList,
      userCounts,
      loadError,
      rolesLoaded,
      getAnalyticsSlugForRoleCode,
    }),
    [tabs, rolesList, userCounts, loadError, rolesLoaded, getAnalyticsSlugForRoleCode]
  );

  return (
    <MembersTabsContext.Provider value={value}>
      {children}
    </MembersTabsContext.Provider>
  );
}

export function useMembersTabs() {
  const ctx = useContext(MembersTabsContext);
  if (!ctx) {
    throw new Error("useMembersTabs must be used within MembersTabsProvider");
  }
  return ctx;
}
