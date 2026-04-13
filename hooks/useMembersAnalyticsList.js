"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUsersAnalytics } from "@/api";
import { MEMBERS_ADD_SUCCESS_EVENT } from "@/lib/membersRoleAnalytics";

/**
 * Loads `super-admin/users-analytics?role=<slug>&…`
 *
 * @param {object} opts
 * @param {string} opts.analyticsRoleSlug e.g. `player`, `organizer`, `tech_team` (must match backend / userCounts keys)
 */
export function useMembersAnalyticsList({ analyticsRoleSlug }) {
  const [analyticsRole, setAnalyticsRole] = useState(null);
  const [data, setData] = useState([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    lastWeek: 0,
    lastMonth: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const onAddSuccess = () => {
      setPage(1);
      bump();
    };
    if (typeof window === "undefined") return undefined;
    window.addEventListener(MEMBERS_ADD_SUCCESS_EVENT, onAddSuccess);
    return () => window.removeEventListener(MEMBERS_ADD_SUCCESS_EVENT, onAddSuccess);
  }, [bump, setPage]);

  useEffect(() => {
    const s = String(analyticsRoleSlug ?? "")
      .trim()
      .toLowerCase();
    setAnalyticsRole(s || null);
  }, [analyticsRoleSlug]);

  useEffect(() => {
    if (!analyticsRole) return undefined;

    let cancelled = false;

    const load = async () => {
      setTableLoading(true);
      try {
        const res = await fetchUsersAnalytics({
          role: analyticsRole,
          search: search || undefined,
          limit,
          page,
        });
        if (cancelled) return;
        setData(res.rows);
        setRemoteTotal(res.total);
        setStats({
          total: res.total,
          lastWeek: res.lastWeek,
          lastMonth: res.lastMonth,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("users-analytics failed:", error);
        if (!cancelled) {
          setData([]);
          setRemoteTotal(0);
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
          setStatsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [analyticsRole, page, limit, search, refreshKey]);

  const totalDeltaPercent =
    stats.total > 0 ? (stats.lastWeek / stats.total) * 100 : 0;

  return {
    analyticsRole,
    data,
    remoteTotal,
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    stats,
    statsLoading,
    tableLoading,
    bump,
    totalDeltaPercent,
  };
}
