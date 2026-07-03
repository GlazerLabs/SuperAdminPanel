"use client";

import { getApi, putApi } from "@/api";

const unwrapPayload = (response) => {
  if (!response || typeof response !== "object") return response;
  if (response.status === 0) {
    const err =
      response?.data?.error ||
      response?.message ||
      "Request failed";
    throw new Error(typeof err === "string" ? err : "Request failed");
  }
  const data = response.data;
  if (Array.isArray(data) && data.length === 1 && typeof data[0] === "object" && !Array.isArray(data[0])) {
    return data[0];
  }
  return data ?? response;
};

const pickNum = (...vals) => {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const pickArray = (...candidates) => {
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

const normalizeTypeRow = (row, index) => {
  const typeId = row?.type ?? row?.type_id ?? row?.kpi_type ?? index;
  return {
    id: typeId,
    type: String(
      row?.type_name ??
        row?.name ??
        row?.label ??
        (row?.type != null ? `Type ${row.type}` : `Type ${index + 1}`)
    ),
    count: pickNum(row?.count, row?.kpi_count, row?.total, row?.value) ?? 0,
    points: pickNum(row?.points, row?.points_awarded, row?.pointsAwarded, row?.value) ?? 0,
    raw: row,
  };
};

const normalizeAchievementRow = (row) => ({
  id: row?.kpi_id ?? row?.id,
  name: String(row?.achievement_name ?? row?.name ?? row?.kpi_name ?? "—"),
  type: row?.type ?? row?.kpi_type ?? "—",
  completionPercent: pickNum(row?.completion_percent, row?.completion_rate, row?.completionRate),
  points: pickNum(row?.points, row?.points_awarded, row?.pointsAwarded),
  usersUnlocked: pickNum(row?.users_unlocked, row?.usersUnlocked) ?? 0,
  progress: pickNum(row?.progress) ?? 0,
  raw: row,
});

export const fetchKpiAnalyticsSummary = async () => {
  const response = await getApi("kpi/analytics-summary");
  const payload = unwrapPayload(response);

  return {
    totalKpis: pickNum(payload?.total_kpis, payload?.totalKpis),
    kpisAddedThisMonth: pickNum(payload?.kpis_added_this_month, payload?.kpisAddedThisMonth),
    usersUnlocked: pickNum(payload?.users_unlocked, payload?.usersUnlocked),
    usersUnlockedChangePercent: pickNum(
      payload?.users_unlocked_change_percent,
      payload?.usersUnlockedChangePercent
    ),
    completionRate: pickNum(payload?.completion_rate, payload?.completionRate),
    completionRateChangePercent: pickNum(
      payload?.completion_rate_change_percent,
      payload?.completionRateChangePercent
    ),
    pointsAwarded: pickNum(payload?.points_awarded, payload?.pointsAwarded),
    pointsAwardedChangePercent: pickNum(
      payload?.points_awarded_change_percent,
      payload?.pointsAwardedChangePercent
    ),
    raw: response,
  };
};

export const fetchKpiAnalyticsByType = async () => {
  const response = await getApi("kpi/analytics-by-type");
  const payload = unwrapPayload(response);

  const kpisByType = pickArray(payload?.kpis_by_type, payload?.kpisByType).map(normalizeTypeRow);
  const pointsByType = pickArray(payload?.points_by_type, payload?.pointsByType).map(normalizeTypeRow);

  return { kpisByType, pointsByType, raw: response };
};

export const fetchKpiAnalyticsCompletions = async () => {
  const response = await getApi("kpi/analytics-completions");
  const payload = unwrapPayload(response);

  const timeline = pickArray(
    payload?.completions,
    payload?.completion_trend,
    payload?.completionTrend,
    payload?.days,
    payload?.rows,
    payload?.timeline
  );

  if (timeline.length) {
    return {
      timeline: timeline.map((row, index) => {
        const date = String(
          row?.date ?? row?.day ?? row?.period ?? row?.bucket ?? row?.created_at ?? ""
        ).trim();
        return {
          id: row?.id ?? `${date}-${index}`,
          date,
          label: date,
          completions: pickNum(row?.completions, row?.count, row?.value, row?.total) ?? 0,
          users: pickNum(row?.users, row?.user_count, row?.unique_users) ?? 0,
          points: pickNum(row?.points, row?.points_awarded, row?.pointsAwarded) ?? 0,
          raw: row,
        };
      }),
      summary: null,
      raw: response,
    };
  }

  return {
    timeline: [],
    summary: {
      totalKpis: pickNum(payload?.total_kpis, payload?.totalKpis),
      usersUnlocked: pickNum(payload?.users_unlocked, payload?.usersUnlocked),
      completionRate: pickNum(payload?.completion_rate, payload?.completionRate),
      pointsAwarded: pickNum(payload?.points_awarded, payload?.pointsAwarded),
    },
    raw: response,
  };
};

export const fetchKpiAnalyticsPerformance = async () => {
  const response = await getApi("kpi/analytics-performance");
  const payload = unwrapPayload(response);

  const hardestAchievements = pickArray(
    payload?.hardest_achievements,
    payload?.hardestAchievements
  ).map(normalizeAchievementRow);

  const topKpiPerformance = pickArray(
    payload?.top_kpi_performance,
    payload?.topKpiPerformance
  ).map(normalizeAchievementRow);

  return { hardestAchievements, topKpiPerformance, raw: response };
};

export const fetchReferralUsers = async () => {
  const response = await getApi("admin/referral-users");
  const payload = unwrapPayload(response);

  const rows = pickArray(
    payload?.users,
    payload?.referral_users,
    payload?.referralUsers,
    payload?.rows,
    Array.isArray(payload) ? payload : null
  );

  return rows.map((row) => {
    const id = row?.id ?? row?.user_id ?? row?.userId;
    return {
      id,
      name: String(
        row?.name ??
          row?.full_name ??
          row?.fullName ??
          row?.username ??
          row?.user_name ??
          "—"
      ),
      email: String(row?.email ?? "—"),
      referralCode: String(row?.referral_code ?? row?.referralCode ?? row?.code ?? "—"),
      referralCount: pickNum(row?.referral_count, row?.referralCount, row?.total_referrals) ?? 0,
      pointsEarned: pickNum(row?.points_earned, row?.pointsEarned, row?.points) ?? 0,
      createdAt: row?.created_at ?? row?.createdAt ?? null,
      raw: row,
    };
  });
};

const normalizeTreeNode = (node, depth = 0) => {
  if (!node || typeof node !== "object") return null;
  const id = node?.id ?? node?.user_id ?? node?.userId;
  const children = pickArray(node?.children, node?.referrals, node?.downline, node?.nodes).map(
    (child) => normalizeTreeNode(child, depth + 1)
  ).filter(Boolean);

  return {
    id,
    name: String(
      node?.name ??
        node?.full_name ??
        node?.fullName ??
        node?.username ??
        node?.user_name ??
        "—"
    ),
    email: String(node?.email ?? "—"),
    referralCode: String(node?.referral_code ?? node?.referralCode ?? node?.code ?? "—"),
    referralCount: pickNum(node?.referral_count, node?.referralCount, node?.total_referrals) ?? 0,
    depth,
    children,
    raw: node,
  };
};

export const fetchReferralUsersTree = async (userId) => {
  if (userId == null || userId === "") {
    throw new Error("User ID is required");
  }
  const response = await getApi("admin/referral-users-tree", { user_id: userId });
  const payload = unwrapPayload(response);

  const root =
    payload?.tree ??
    payload?.root ??
    (payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null);

  if (Array.isArray(root)) {
    return root.map((node) => normalizeTreeNode(node)).filter(Boolean);
  }

  const normalized = normalizeTreeNode(root);
  return normalized ? [normalized] : [];
};

const normalizeKpiApprovalRow = (row) => ({
  id: row?.id ?? row?.kpi_id,
  name: String(row?.achievement_name ?? row?.name ?? row?.kpi_name ?? row?.title ?? "—"),
  typeName: String(row?.type_name ?? "—"),
  type: row?.type ?? row?.kpi_type ?? "—",
  gems: pickNum(row?.gems_allocation, row?.gems, row?.gem, row?.gem_count),
  tokens: pickNum(row?.tokens, row?.token, row?.token_count),
  targetPoints: pickNum(row?.target_points, row?.targetPoints),
  userFacingGoal: String(row?.user_facing_goal ?? row?.userFacingGoal ?? ""),
  imageUrl: row?.image_url ?? row?.imageUrl ?? null,
  status: String(row?.status ?? "").toLowerCase(),
  createdAt: row?.created_at ?? row?.createdAt ?? null,
  createdById: row?.created_by_id ?? row?.createdById ?? null,
  createdBy: String(
    row?.created_by_name ??
      row?.admin_name ??
      row?.created_by ??
      (row?.created_by_id != null ? `Admin #${row.created_by_id}` : "—")
  ),
  description: String(row?.description ?? ""),
  medalType: row?.medal_type ?? row?.medalType ?? null,
  raw: row,
});

export const fetchKpiApprovalList = async ({ page = 1, limit = 20, status } = {}) => {
  const params = { page, limit };
  if (status) params.status = status;

  const response = await getApi("kpi", params);

  if (response?.status === 0) {
    const err = response?.message || response?.data?.error || "Failed to load KPIs";
    throw new Error(typeof err === "string" ? err : "Failed to load KPIs");
  }

  const meta = response?.meta && typeof response.meta === "object" ? response.meta : {};
  const data = response?.data;

  const rows = pickArray(Array.isArray(data) ? data : null, data?.kpis, data?.rows, data?.list).map(
    normalizeKpiApprovalRow
  );

  const total = pickNum(meta.total, meta.totalCount, meta.total_count) ?? rows.length;
  const totalPages = pickNum(meta.totalPages, meta.total_pages) ?? Math.max(1, Math.ceil(total / limit));

  return {
    rows,
    total,
    totalPages,
    page: pickNum(meta.page) ?? page,
    raw: response,
  };
};

export const updateKpiApprovalStatus = async (kpiId, status) => {
  if (kpiId == null || kpiId === "") {
    throw new Error("KPI ID is required");
  }

  const response = await putApi(`kpi/${kpiId}/status-update`, { status });

  if (response?.status === 0) {
    const err =
      response?.data?.error ||
      response?.message ||
      "Failed to update KPI status";
    throw new Error(typeof err === "string" ? err : "Failed to update KPI status");
  }

  return response;
};

const normalizeLoginStreakRow = (row) => {
  const creator = row?.created_by && typeof row.created_by === "object" ? row.created_by : {};
  return {
    id: row?.id ?? row?.reward_id ?? row?.rewardId,
    day: pickNum(row?.day, row?.streak_day, row?.day_number),
    normalGems: pickNum(row?.normal_gems, row?.normalGems),
    adGems: pickNum(row?.ad_gems, row?.adGems),
    isActive: row?.is_active ?? row?.isActive ?? null,
    status: String(row?.status ?? "").toLowerCase(),
    createdAt: row?.created_at ?? row?.createdAt ?? null,
    updatedAt: row?.updated_at ?? row?.updatedAt ?? null,
    createdById: creator?.id ?? row?.created_by_id ?? null,
    createdByName: String(
      creator?.full_name ?? creator?.username ?? creator?.email ?? ""
    ),
    createdByAvatar: creator?.profile_pic_url ?? null,
    raw: row,
  };
};

export const fetchLoginStreakRewards = async () => {
  const response = await getApi("login-streak/admin/rewards");

  if (response?.status === 0) {
    const err = response?.message || response?.data?.error || "Failed to load login streak rewards";
    throw new Error(typeof err === "string" ? err : "Failed to load login streak rewards");
  }

  const data = response?.data;
  const rows = pickArray(
    Array.isArray(data) ? data : null,
    data?.rewards,
    data?.rows,
    data?.list,
    data?.data
  ).map(normalizeLoginStreakRow);

  return { rows, raw: response };
};

export const updateLoginStreakRewardStatus = async (ids, status) => {
  const idList = (Array.isArray(ids) ? ids : [ids]).filter((id) => id != null && id !== "");
  if (!idList.length) {
    throw new Error("At least one reward ID is required");
  }

  const response = await putApi("login-streak/super-admin/revards-aproval", {
    status,
    ids: idList,
  });

  if (response?.status === 0) {
    const err =
      response?.data?.error ||
      response?.message ||
      "Failed to update login streak reward status";
    throw new Error(typeof err === "string" ? err : "Failed to update login streak reward status");
  }

  return response;
};
