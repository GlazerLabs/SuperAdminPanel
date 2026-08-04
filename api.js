"use client";

import axios from "axios";
import { useAuthStore } from "@/zustand/auth";

const sanitizePayload = (value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizePayload).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const cleaned = Object.entries(value).reduce((acc, [key, val]) => {
      const sanitized = sanitizePayload(val);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    }, {});
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return value;
};

/**
 * Simple GET request function using axios.
 * Pass only the endpoint and optional query params.
 */
export const getApi = async (endpoint, params = null) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      headers,
      withCredentials: true,
      params,
    };

    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error);
    throw error;
  }
};

/**
 * Simple POST request function using axios.
 * Pass only the endpoint and body data.
 */
export const postApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    const headers = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      url,
      isFormData ? data : sanitizePayload(data) ?? {},
      {
      headers,
      withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error.response?.data);
    // eslint-disable-next-line no-console
    console.error("API error:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Simple PATCH request function using axios.
 * Pass only the endpoint and body data.
 */
export const patchApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.patch(url, data, {
      headers,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error);
    throw error;
  }
};

/**
 * Simple PUT request function using axios.
 * Pass only the endpoint and body data.
 */
export const putApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.put(url, data, {
      headers,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * DELETE request using axios (JSON body when provided).
 */
export const deleteApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.delete(url, {
      headers,
      withCredentials: true,
      data: data ?? undefined,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

const pickNum = (...vals) => {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const pickFirstArray = (...candidates) => {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length >= 0) return c;
  }
  return [];
};

/**
 * Map a backend user row into the Members table row shape.
 */
export const mapAnalyticsUserToMemberRow = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id ?? raw.user_id ?? raw.userId ?? raw._id;
  if (id === undefined || id === null) return null;

  const nameCandidate =
    raw.full_name ??
    raw.fullName ??
    raw.name ??
    raw.display_name ??
    raw.username ??
    raw.user_name ??
    raw.userName;
  const mobileStr = raw.mobile != null ? String(raw.mobile).trim() : "";
  const name =
    nameCandidate != null && String(nameCandidate).trim() !== ""
      ? String(nameCandidate).trim()
      : mobileStr || "—";

  return {
    id,
    name: String(name),
    username: String(
      raw.username ?? raw.user_name ?? raw.userName ?? (mobileStr || "—")
    ),
    avatar: raw.profile_pic_url ?? raw.profilePicUrl ?? raw.avatar ?? null,
    contact: String(
      raw.mobile ?? raw.phone ?? raw.contact ?? raw.phone_number ?? "—"
    ),
    email: String(raw.email ?? "—"),
    ingameName:
      raw.ingame_name ??
      raw.ingameName ??
      raw.thryl_username ??
      raw.game_username ??
      null,
    ingameId:
      raw.ingame_id ?? raw.ingameId ?? raw.thryl_id ?? raw.game_user_id ?? null,
    ownerName: raw.owner_name ?? raw.ownerName ?? null,
    _raw: raw,
  };
};

/**
 * GET super-admin users analytics (list + stats).
 * Query: role, search, limit, page
 */
export const fetchUsersAnalytics = async (params = {}) => {
  const response = await getApi("super-admin/users-analytics", params);

  const root = Array.isArray(response?.data) ? response.data[0] : response?.data ?? response;
  const meta =
    response?.meta && typeof response.meta === "object" ? response.meta : {};

  const users = pickFirstArray(
    root?.users,
    root?.rows,
    root?.data,
    root?.list,
    Array.isArray(root) ? root : null
  );

  const rows = users
    .map(mapAnalyticsUserToMemberRow)
    .filter(Boolean);

  const hasMetaListTotal =
    Object.prototype.hasOwnProperty.call(meta, "totalCount") ||
    Object.prototype.hasOwnProperty.call(meta, "total_count") ||
    Object.prototype.hasOwnProperty.call(meta, "totalFilteredUsers") ||
    Object.prototype.hasOwnProperty.call(meta, "total_filtered_users");

  /** Pagination total: newer API uses `meta.totalCount`; older used `meta.totalFilteredUsers`. */
  const metaListTotal = pickNum(
    meta.totalCount,
    meta.total_count,
    meta.totalFilteredUsers,
    meta.total_filtered_users
  );

  const totalLegacy = pickNum(
    root?.total,
    root?.total_count,
    root?.totalCount,
    response?.total,
    0
  );

  const totalFromStats = pickNum(
    meta.totalUsers,
    meta.total_users,
    root?.total_users,
    root?.totalUsers,
    root?.analytics?.total
  );

  const total = hasMetaListTotal
    ? metaListTotal
    : totalLegacy || totalFromStats || rows.length;

  const lastWeek = pickNum(
    meta.lastWeek,
    meta.last_week,
    root?.last_week,
    root?.lastWeek,
    root?.last_week_users,
    root?.analytics?.last_week
  );

  const lastMonth = pickNum(
    meta.lastMonth,
    meta.last_month,
    root?.last_month,
    root?.lastMonth,
    root?.last_month_users,
    root?.analytics?.last_month
  );

  return {
    rows,
    total,
    lastWeek,
    lastMonth,
    raw: response,
  };
};

const looksLikeListItem = (item) => {
  if (!item || typeof item !== "object") return false;
  return (
    item.id != null ||
    item.user_id != null ||
    item.userId != null ||
    item.team_id != null ||
    item.teamId != null
  );
};

/**
 * Normalize paginated list payloads from tournament acquisition endpoints.
 */
const normalizeAcquisitionListResponse = (response) => {
  const meta =
    response?.meta && typeof response.meta === "object" ? response.meta : {};

  let root = {};
  if (Array.isArray(response?.data)) {
    const first = response.data[0];
    root =
      first && typeof first === "object" && !looksLikeListItem(first)
        ? first
        : { list: response.data };
  } else if (response?.data && typeof response.data === "object") {
    root = response.data;
  } else if (response && typeof response === "object") {
    root = response;
  }

  const rows = pickFirstArray(
    root?.users,
    root?.teams,
    root?.rows,
    root?.list,
    root?.items,
    root?.data,
    Array.isArray(root) ? root : null,
    Array.isArray(response?.data) ? response.data : null
  );

  const total = pickNum(
    meta.totalCount,
    meta.total_count,
    meta.total,
    root?.total,
    root?.total_count,
    root?.totalCount,
    response?.total,
    rows.length
  );

  const page = pickNum(meta.page, meta.currentPage, root?.page, 1);
  const limit = pickNum(meta.limit, meta.pageSize, root?.limit, rows.length || 20);
  const totalPages = pickNum(
    meta.totalPages,
    meta.total_pages,
    root?.totalPages,
    total > 0 && limit > 0 ? Math.ceil(total / limit) : 1
  );

  return { rows, total, page, limit, totalPages, raw: response };
};

const mapAcquiredUserRow = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const id =
    raw.userId ??
    raw.user_id ??
    raw.id ??
    raw._id ??
    raw.acquired_user_id;
  if (id === undefined || id === null) return null;

  const nameCandidate =
    raw.fullName ??
    raw.full_name ??
    raw.name ??
    raw.display_name ??
    raw.username ??
    raw.user_name;
  const mobileStr = raw.mobile != null ? String(raw.mobile).trim() : "";
  const name =
    nameCandidate != null && String(nameCandidate).trim() !== ""
      ? String(nameCandidate).trim()
      : mobileStr || "—";

  const emailRaw = raw.email;
  const email =
    emailRaw != null && String(emailRaw).trim() !== ""
      ? String(emailRaw).trim()
      : "—";

  return {
    id,
    name: String(name),
    username: String(
      raw.username ?? raw.user_name ?? raw.userName ?? (mobileStr || "—")
    ),
    avatar: raw.profile_pic_url ?? raw.profilePicUrl ?? raw.avatar ?? null,
    contact: mobileStr || "—",
    email,
    region: raw.region ?? null,
    checkInStatus: raw.checkInStatus ?? raw.check_in_status ?? null,
    teamId: raw.teamId ?? raw.team_id ?? null,
    teamName: raw.teamName ?? raw.team_name ?? null,
    teamType: raw.teamType ?? raw.team_type ?? null,
    roleInTeam: raw.roleInTeam ?? raw.role_in_team ?? null,
    registeredAt:
      raw.registeredAt ??
      raw.registered_at ??
      raw.acquired_at ??
      raw.acquiredAt ??
      null,
    userCreatedAt:
      raw.userCreatedAt ??
      raw.user_created_at ??
      raw.created_at ??
      raw.createdAt ??
      null,
    _raw: raw,
  };
};

/**
 * Teams endpoint: data[0].teams[] with teamId, teamName, ownerName, …
 */
const mapAcquiredTeamRow = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.teamId ?? raw.team_id ?? raw.id ?? raw._id;
  if (id === undefined || id === null) return null;

  const nameCandidate =
    raw.teamName ?? raw.team_name ?? raw.name ?? raw.title;
  const name =
    nameCandidate != null && String(nameCandidate).trim() !== ""
      ? String(nameCandidate).trim()
      : `Team #${id}`;

  return {
    id,
    teamId: id,
    teamName: String(name),
    teamCode: raw.teamCode ?? raw.team_code ?? null,
    teamType: raw.teamType ?? raw.team_type ?? null,
    teamCreatedAt: raw.teamCreatedAt ?? raw.team_created_at ?? null,
    ownerId: raw.ownerId ?? raw.owner_id ?? null,
    ownerName: raw.ownerName ?? raw.owner_name ?? null,
    memberCount: pickNum(
      raw.memberCount,
      raw.member_count,
      raw.membersCount,
      raw.members_count
    ),
    registeredAt: raw.registeredAt ?? raw.registered_at ?? null,
    checkInStatus: raw.checkInStatus ?? raw.check_in_status ?? null,
    region: raw.region ?? null,
    _raw: raw,
  };
};

/**
 * GET tournament acquisition summary cards.
 * Query: tournamentId
 *
 * Response shape:
 * { data: [{ acquiredUsers, acquiredTeams, totalRegisteredUsers,
 *            totalRegisteredTeams, userAcquisitionRate, teamAcquisitionRate }],
 *   meta: { tournamentId, tournamentTitle, windowStart, windowEnd, … } }
 */
export const fetchTournamentAcquisitionSummary = async (tournamentId) => {
  const response = await getApi("super-admin/tournament-acquisition-summary", {
    tournamentId: Number(tournamentId) || tournamentId,
  });

  const root = Array.isArray(response?.data)
    ? response.data[0] ?? {}
    : response?.data && typeof response.data === "object"
      ? response.data
      : response && typeof response === "object"
        ? response
        : {};

  const meta =
    response?.meta && typeof response.meta === "object" ? response.meta : {};

  const pickRate = (...vals) => {
    for (const v of vals) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return "0%";
  };

  return {
    acquiredUsers: pickNum(root.acquiredUsers, root.acquired_users),
    acquiredTeams: pickNum(root.acquiredTeams, root.acquired_teams),
    totalRegisteredUsers: pickNum(
      root.totalRegisteredUsers,
      root.total_registered_users
    ),
    totalRegisteredTeams: pickNum(
      root.totalRegisteredTeams,
      root.total_registered_teams
    ),
    userAcquisitionRate: pickRate(
      root.userAcquisitionRate,
      root.user_acquisition_rate
    ),
    teamAcquisitionRate: pickRate(
      root.teamAcquisitionRate,
      root.team_acquisition_rate
    ),
    tournamentTitle: meta.tournamentTitle ?? meta.tournament_title ?? null,
    windowStart: meta.windowStart ?? meta.window_start ?? null,
    windowEnd: meta.windowEnd ?? meta.window_end ?? null,
    raw: response,
    root,
    meta,
  };
};

/**
 * GET acquired users for a tournament.
 * Query: tournamentId, search, limit, page
 */
export const fetchTournamentAcquiredUsers = async (params = {}) => {
  const {
    tournamentId,
    search = "",
    limit = 20,
    page = 1,
  } = params;

  const response = await getApi("super-admin/tournament-acquired-users", {
    tournamentId: Number(tournamentId) || tournamentId,
    search: search || undefined,
    limit,
    page,
  });

  const normalized = normalizeAcquisitionListResponse(response);
  const rows = normalized.rows.map(mapAcquiredUserRow).filter(Boolean);

  return {
    ...normalized,
    rows,
    total: normalized.total || rows.length,
  };
};

/**
 * GET acquired teams for a tournament.
 * Query: tournamentId, search, limit, page, excludeSolo
 */
export const fetchTournamentAcquiredTeams = async (params = {}) => {
  const {
    tournamentId,
    search = "",
    limit = 20,
    page = 1,
    excludeSolo = true,
  } = params;

  const response = await getApi("super-admin/tournament-acquired-teams", {
    tournamentId: Number(tournamentId) || tournamentId,
    search: search || undefined,
    limit,
    page,
    excludeSolo,
  });

  const normalized = normalizeAcquisitionListResponse(response);
  const rows = normalized.rows.map(mapAcquiredTeamRow).filter(Boolean);

  return {
    ...normalized,
    rows,
    total: normalized.total || rows.length,
  };
};

export const createOrganizerTeamMember = (payload) =>
  postApi("organizer/create-team", payload);

export const updateOrganizerTeamMember = (payload) =>
  putApi("organizer/update-team", payload);

export const deleteOrganizerTeamMember = (payload) =>
  deleteApi("organizer/delete-team", payload);

export const deleteMemberUser = (userId) =>
  deleteApi("super-admin/delete-user", { userId: Number(userId) });

export const updateMemberUserDetails = (userId, payload = {}) =>
  putApi(`super-admin/update-user-details?userId=${encodeURIComponent(String(userId))}`, payload);

export const uploadImage = async (file, type = "user") => {
  if (!file) throw new Error("File is required");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  const response = await postApi("storage/upload", formData);
  return response?.data?.[0]?.url || response?.data?.url || response?.url || null;
};

/**
 * Fetch user type counts for dashboard stats.
 * Uses a service token from env instead of the auth store token.
 */
export const fetchUserTypeCounts = async (type = "super_admin") => {
  try {
    const response = await getApi("profile/user-type-counts", { type });
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch user type counts:", error);
    throw error;
  }
};

/**
 * Fetch dashboard user counts:
 * - totalUsers (overall)
 * - users (within selected date range)
 */
export const fetchDashboardUserCounts = async (startDate, endDate) => {
  try {
    const response = await getApi("super-admin/get-user-counts", {
      startDate,
      endDate,
    });
    return response;
  } catch (error) {
    console.error("Failed to fetch dashboard user counts:", error);
    throw error;
  }
};

/**
 * Read current logged-in admin profile.
 * Tries `GET profile/read-profile` first, then falls back to `POST` with token in body.
 */
export const readProfile = async () => {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Not authenticated: missing token");

  const normalizeProfileResponse = (resp) => {
    // Your backend response looks like:
    // { status: 1, message: "success", data: [ { ...profileFields } ] }
    if (Array.isArray(resp?.data)) {
      return resp.data[0] ?? null;
    }

    // Other possible shapes (defensive)
    return (
      resp?.profile ??
      resp?.data?.profile ??
      resp?.data?.user ??
      resp?.user ??
      resp?.data ??
      null
    );
  };

  try {
    const res = await getApi("profile/read-profile");
    return normalizeProfileResponse(res);
  } catch (getErr) {
    // Some backends may require POST; include token in body as requested.
    const res = await postApi("profile/read-profile", { token });
    return normalizeProfileResponse(res);
  }
};

/**
 * Fetch frontend module access for current logged-in user.
 */
export const fetchFrontendMyAccess = async (accessToken) => {
  const token = accessToken || useAuthStore.getState()?.token;
  if (!token) throw new Error("Not authenticated: missing token");

  const response = await getApi(
    "access-module/frontend/my-access",
  );

  return response;
};

/**
 * Logout helper that also clears auth store and redirects.
 */
export const logout = () => {
  const { logout: logoutAction } = useAuthStore.getState();
  logoutAction();
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};


