"use client";

import { useState } from "react";
import { TabBar } from "@/components/kpi-analytics/KpiSection";
import KpiApprovalsPanel from "@/components/kpi-analytics/KpiApprovalsPanel";
import LoginStreakApprovalsPanel from "@/components/kpi-analytics/LoginStreakApprovalsPanel";

const APPROVAL_TABS = [
  { id: "kpi", label: "KPI" },
  { id: "login-streak", label: "Login streak" },
];

export default function ApprovalsPanel() {
  const [activeApproval, setActiveApproval] = useState("kpi");

  return (
    <div className="space-y-4">
      <TabBar tabs={APPROVAL_TABS} active={activeApproval} onChange={setActiveApproval} />

      {activeApproval === "kpi" ? <KpiApprovalsPanel /> : null}
      {activeApproval === "login-streak" ? <LoginStreakApprovalsPanel /> : null}
    </div>
  );
}
