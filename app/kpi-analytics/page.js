"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ApprovalsPanel from "@/components/kpi-analytics/ApprovalsPanel";
import KpiPerformanceTable from "@/components/kpi-analytics/KpiPerformanceTable";
import KpiReferralPanel from "@/components/kpi-analytics/KpiReferralPanel";
import LoginStreakClaimUsersPanel from "@/components/kpi-analytics/LoginStreakClaimUsersPanel";
import {
  ChangeBadge,
  EmptyPanel,
  SectionCard,
  ShimmerCard,
  TabBar,
} from "@/components/kpi-analytics/KpiSection";
import {
  fetchKpiAnalyticsByType,
  fetchKpiAnalyticsCompletions,
  fetchKpiAnalyticsPerformance,
  fetchKpiAnalyticsSummary,
  fetchReferralUsers,
  fetchReferralUsersTree,
} from "@/kpiAnalyticsApi";

const PAGE_TABS = [
  { id: "analytics", label: "Analytics" },
  { id: "approvals", label: "Approvals" },
];

const PERFORMANCE_VIEWS = [
  { id: "all", label: "All KPIs" },
  { id: "hardest", label: "Hardest" },
];

const SUMMARY_CARDS = [
  { label: "Total KPIs", key: "totalKpis", format: "number" },
  { label: "Added this month", key: "kpisAddedThisMonth", format: "number" },
  { label: "Users unlocked", key: "usersUnlocked", format: "number", changeKey: "usersUnlockedChangePercent" },
  { label: "Completion rate", key: "completionRate", format: "percent", changeKey: "completionRateChangePercent" },
  { label: "Points awarded", key: "pointsAwarded", format: "number", changeKey: "pointsAwardedChangePercent" },
];

const INDIGO = "#4f46e5";
const VIOLET = "#7c3aed";
const tickStyle = { fontSize: 13, fill: "#64748b", fontWeight: 500 };

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 1000) return `${Math.round(num)}`;
  const thousandsValue = num / 1000;
  const fixed = thousandsValue.toFixed(2);
  return `${fixed.replace(/\.?0+$/, "")}k`;
}

function formatPercent(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `${Math.round(num)}%`;
}

function formatCardValue(value, format) {
  if (value === null || value === undefined) return "—";
  if (format === "percent") return formatPercent(value);
  return formatCompact(value);
}

function formatAxisValue(v) {
  return v >= 1000 ? `${v / 1000}K` : String(v);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <div className="font-semibold text-slate-900">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="mt-1.5 text-slate-600">
          {item.name}:{" "}
          <span className="font-semibold text-slate-900">
            {Number(item.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function KpiAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [performanceView, setPerformanceView] = useState("all");
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState({ kpisByType: [], pointsByType: [] });
  const [completions, setCompletions] = useState({ timeline: [], summary: null });
  const [performance, setPerformance] = useState({ hardestAchievements: [], topKpiPerformance: [] });
  const [referralUsers, setReferralUsers] = useState([]);
  const [referralTree, setReferralTree] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [treeUserId, setTreeUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState("");
  const [treeError, setTreeError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, byTypeRes, completionsRes, performanceRes, referralRes] = await Promise.all([
        fetchKpiAnalyticsSummary(),
        fetchKpiAnalyticsByType(),
        fetchKpiAnalyticsCompletions(),
        fetchKpiAnalyticsPerformance(),
        fetchReferralUsers(),
      ]);

      setSummary(summaryRes);
      setByType(byTypeRes);
      setCompletions(completionsRes);
      setPerformance(performanceRes);
      setReferralUsers(referralRes);

      setSelectedUserId((current) => {
        if (current) return current;
        return referralRes[0]?.id != null ? String(referralRes[0].id) : "";
      });
    } catch (err) {
      setError(err?.message || "Failed to load KPI analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "analytics") return;
    loadAll();
  }, [loadAll, activeTab]);

  const loadReferralTree = useCallback(async (userId) => {
    if (!userId) return;
    setTreeLoading(true);
    setTreeError("");
    try {
      const tree = await fetchReferralUsersTree(userId);
      setReferralTree(tree);
    } catch (err) {
      setReferralTree([]);
      setTreeError(err?.message || "Failed to load referral tree");
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    loadReferralTree(selectedUserId);
  }, [selectedUserId, loadReferralTree]);

  const completionsChartData = useMemo(
    () =>
      completions.timeline.map((row) => ({
        label: row.label || row.date || "—",
        completions: row.completions,
        users: row.users,
      })),
    [completions.timeline]
  );

  const kpisByTypeChartData = useMemo(
    () => byType.kpisByType.map((row) => ({ type: row.type, count: row.count })),
    [byType.kpisByType]
  );

  const pointsByTypeChartData = useMemo(
    () => byType.pointsByType.map((row) => ({ type: row.type, points: row.points })),
    [byType.pointsByType]
  );

  const performanceRows = useMemo(
    () =>
      performanceView === "hardest"
        ? performance.hardestAchievements
        : performance.topKpiPerformance,
    [performanceView, performance.hardestAchievements, performance.topKpiPerformance]
  );

  const handleTreeSearch = (e) => {
    e.preventDefault();
    if (!treeUserId.trim()) return;
    setSelectedUserId(treeUserId.trim());
  };

  return (
    <main className="space-y-6">
      <TabBar tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} variant="underline" />

      {activeTab === "approvals" ? <ApprovalsPanel /> : null}

      {activeTab === "analytics" ? (
        <div className="space-y-6">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {loading
              ? SUMMARY_CARDS.map((card) => <ShimmerCard key={card.key} />)
              : SUMMARY_CARDS.map((card) => (
                  <div
                    key={card.key}
                    className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
                  >
                    <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      {formatCardValue(summary?.[card.key], card.format)}
                    </p>
                    {card.changeKey ? <ChangeBadge value={summary?.[card.changeKey]} /> : null}
                  </div>
                ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="KPIs by type">
              {loading ? (
                <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
              ) : kpisByTypeChartData.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpisByTypeChartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={tickStyle}
                        allowDecimals={false}
                        width={40}
                        tickFormatter={formatAxisValue}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
                      <Bar dataKey="count" fill={INDIGO} name="KPIs" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyPanel title="No data" />
              )}
            </SectionCard>

            <SectionCard title="Points by type">
              {loading ? (
                <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
              ) : pointsByTypeChartData.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pointsByTypeChartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={tickStyle}
                        allowDecimals={false}
                        width={40}
                        tickFormatter={formatAxisValue}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
                      <Bar dataKey="points" fill={VIOLET} name="Points" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyPanel title="No data" />
              )}
            </SectionCard>
          </div>

          {completionsChartData.length || loading ? (
            <SectionCard title="Completions over time">
              {loading ? (
                <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completionsChartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={tickStyle}
                        allowDecimals={false}
                        width={40}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="completions"
                        stroke={INDIGO}
                        strokeWidth={2}
                        dot={false}
                        name="Completions"
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke={VIOLET}
                        strokeWidth={2}
                        dot={false}
                        name="Users"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
          ) : null}

          <SectionCard
            title="Achievement performance"
            subtitle={
              performanceView === "all" && performance.topKpiPerformance.length
                ? `${performance.topKpiPerformance.length} KPIs`
                : undefined
            }
            action={
              <TabBar tabs={PERFORMANCE_VIEWS} active={performanceView} onChange={setPerformanceView} />
            }
          >
            {loading ? (
              <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <div className="max-h-112 overflow-y-auto">
                <KpiPerformanceTable rows={performanceRows} />
              </div>
            )}
          </SectionCard>

          <KpiReferralPanel
            loading={loading}
            referralUsers={referralUsers}
            referralTree={referralTree}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            treeUserId={treeUserId}
            onTreeUserIdChange={setTreeUserId}
            onTreeSearch={handleTreeSearch}
            treeLoading={treeLoading}
            treeError={treeError}
          />

          <LoginStreakClaimUsersPanel />
        </div>
      ) : null}
    </main>
  );
}
