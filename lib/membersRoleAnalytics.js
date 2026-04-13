import { getApi } from "@/api";

/**
 * Parse `GET role` response the same way as {@link contexts/RolesContext.jsx}.
 */
export function parseRolesListResponse(response) {
  const nestedData = Array.isArray(response?.data) ? response.data[0] : null;
  if (Array.isArray(nestedData?.data)) return nestedData.data;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.roles)) return response.roles;
  return [];
}

/**
 * Slug for `users-analytics?role=` — matches `userCounts` keys (e.g. PLAYER → player,
 * ORGANIZER_TEAM → organizer_team, TECH TEAM → tech_team).
 */
export function analyticsSlugFromRoleName(name) {
  const raw = String(name ?? "").trim();
  if (!raw) return "";
  return raw.replace(/\s+/g, "_").toLowerCase();
}

const DISPLAY_NAME_MAP = {
  PLAYER: "User",
  ADMIN: "Admin",
  ORGANIZER: "Organizer",
  ORGANIZER_TEAM: "Organizer Teams",
  FREELANCER: "Freelancer",
  SUPER_ADMIN: "Super Admin",
};

function titleCaseWords(s) {
  return String(s)
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Tab label shown in members layout */
export function displayLabelForRole(role) {
  const key = String(role?.name ?? "").trim().toUpperCase();
  if (DISPLAY_NAME_MAP[key]) return DISPLAY_NAME_MAP[key];
  return titleCaseWords(role?.name ?? "Role");
}

/**
 * Map core roles to existing routes; custom roles (e.g. T1, HS) use `/members/role/[roleCode]`.
 */
export function membersHrefForRole(role) {
  const code = Number(role?.role_code ?? role?.roleCode);
  if (!Number.isFinite(code)) return "/members/users";
  const byCode = {
    1: "/members/admin",
    2: "/members/users",
    3: "/members/organizers",
    4: "/members/organizer-teams",
    5: "/members/freelancers",
    6: "/members/super-admin",
  };
  if (byCode[code]) return byCode[code];
  return `/members/role/${encodeURIComponent(String(code))}`;
}

/** Fired after layout "Add" uses default `organizer/create-team` path (see MembersWorkspaceContext). */
export const MEMBERS_ADD_SUCCESS_EVENT = "members-workspace-add-success";

/**
 * `type` for `POST organizer/create-team` from the current members URL
 * (aligned with core role codes in {@link membersHrefForRole}).
 */
export function getMembersPathCreateType(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/members";
  const roleMatch = p.match(/^\/members\/role\/(\d+)$/);
  if (roleMatch) return Number(roleMatch[1]);
  if (p.includes("/admin")) return 1;
  if (p.includes("/organizer-teams")) return 4;
  if (p.includes("/organizers")) return 3;
  if (p.includes("/freelancers")) return 5;
  if (p.includes("/super-admin")) return 6;
  if (p.includes("/users")) return 2;
  if (p === "/members") return 2;
  return 2;
}

let rolesListCachePromise = null;

/**
 * Cached `GET role` for members tabs (shared with {@link contexts/MembersTabsContext.jsx}).
 */
export function fetchRolesListForMembersCached() {
  if (!rolesListCachePromise) {
    rolesListCachePromise = getApi("role", { page: 1, limit: 100 }).catch((err) => {
      rolesListCachePromise = null;
      throw err;
    });
  }
  return rolesListCachePromise;
}

export function invalidateMembersRolesCache() {
  rolesListCachePromise = null;
}
