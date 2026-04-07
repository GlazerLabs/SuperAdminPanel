"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getApi } from "@/api";
import { useLeadFormStore } from "@/zustand/leadForm";

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualification",
  "Proposal Shared",
  "Negotiation",
  "Won",
  "Lost",
];

const PRIMARY_CHANNELS = [
  "Email",
  "Phone",
  "WhatsApp",
  "In-person",
  "Social",
  "Website",
  "Referral",
  "Other",
];

const EXPENSE_MODELS = ["Fixed", "Revenue Share", "Hybrid", "TBD"];

const PAYMENT_TERMS = ["Advance", "Milestones", "Post-completion", "NET 15", "NET 30", "Custom"];

const DELIVERABLE_TYPES = [
  "Tournament / League",
  "One-off Event",
  "Influencer Campaign",
  "Branding / Integration",
  "Content Production",
  "Community Activation",
  "Other",
];

const OUTCOME_OPTIONS = ["Progressed", "No Change", "Blocked"];

const UPDATE_TYPE_OPTIONS = ["Follow-up", "Meeting", "Proposal", "Negotiation", "Closure", "Other"];
const CLIENT_SENTIMENT_OPTIONS = ["Positive", "Neutral", "Negative", "Not discussed"];
const CHANNEL_OPTIONS_UPDATE = ["Email", "Phone", "Call", "WhatsApp", "In-person", "Social", "Website", "Referral", "Other"];

const STATUS_CONFIRMATION_OPTIONS = [
  "New",
  "In Progress",
  "On Hold",
  "Won",
  "Lost",
  "Closed (No Go)",
];

const STEP_DEFINITIONS = [
  { id: 1, title: "Lead basics" },
  { id: 2, title: "Contacts & stakeholders" },
  { id: 3, title: "Requirements & plan" },
  { id: 4, title: "Commercials" },
  { id: 5, title: "Updates log" },
];

const INITIAL_LEAD = {
  // Step 1: Lead basics
  brand: "",
  activityName: "",
  leadOwner: "",
  currentStatus: "",
  nextFollowUpDate: "",
  nextStep: "",
  primaryChannel: "",
  leadSource: "",
  cityRegion: "",
  mode: "",
  activityType: "",
  priority: "",
  tags: "",

  // Step 2: Contacts & stakeholders
  primaryContactName: "",
  phone: "",
  email: "",
  role: "",
  decisionMakerKnown: "No",
  decisionMakerName: "",
  decisionMakerRole: "",
  procurementContact: "",
  agencyInvolved: "",
  preferredContactTime: "",

  // Step 3: Requirements & plan
  objective: "",
  deliverableTypes: [],
  activityDate: "",
  activityWindowFrom: "",
  activityWindowTo: "",
  geographyScope: "",
  participantsEstimate: "",
  gameTitles: "",
  integrations: "",
  successMetrics: "",
  dependencies: "",

  // Step 4: Commercials
  expectedRevenueType: "value",
  expectedRevenueValue: "",
  expectedRevenueRange: "",
  expectedRevenueNote: "",
  expenseModel: "",
  paymentTerms: "",
  gstApplicable: "Yes",
  expectedExpenses: "",
  revenueModel: "",
  invoiceEntity: "",
  discountTerms: "",
  proposalDueDate: "",
};

const SAMPLE_LEADS = [
  {
    id: 1,
    brand: "Brand A",
    activityName: "Campus esports fest",
    leadOwner: "Anand Mishra",
    currentStatus: "Proposal Shared",
    nextFollowUpDate: "2026-03-18",
    primaryChannel: "Email",
    expectedRevenueType: "value",
    expectedRevenueValue: "800000",
    cityRegion: "PAN India",
  },
  {
    id: 2,
    brand: "Brand B",
    activityName: "Influencer weekend push",
    leadOwner: "Deep Patel",
    currentStatus: "Negotiation",
    nextFollowUpDate: "2026-03-15",
    primaryChannel: "WhatsApp",
    expectedRevenueType: "range",
    expectedRevenueRange: "500000-900000",
    cityRegion: "Metro + Tier 1",
  },
  {
    id: 3,
    brand: "Brand C",
    activityName: "Publisher collab series",
    leadOwner: "Adarsh Ashu",
    currentStatus: "Contacted",
    nextFollowUpDate: "2026-03-14",
    primaryChannel: "Phone",
    expectedRevenueType: "value",
    expectedRevenueValue: "600000",
    cityRegion: "South India",
  },
  {
    id: 4,
    brand: "Brand D",
    activityName: "Diwali gaming carnival",
    leadOwner: "Person 4",
    currentStatus: "New",
    nextFollowUpDate: "2026-03-20",
    primaryChannel: "Referral",
    expectedRevenueType: "range",
    expectedRevenueRange: "300000-700000",
    cityRegion: "Tier 2 + Tier 3",
  },
  {
    id: 5,
    brand: "Brand E",
    activityName: "Streamer showdown",
    leadOwner: "Person 5",
    currentStatus: "Qualification",
    nextFollowUpDate: "2026-03-16",
    primaryChannel: "Social",
    expectedRevenueType: "value",
    expectedRevenueValue: "450000",
    cityRegion: "Metro cities",
  },
];

function parseRevenue(lead) {
  if (lead.expectedRevenueType === "value" && lead.expectedRevenueValue) {
    const n = Number(String(lead.expectedRevenueValue).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (lead.expectedRevenueType === "range" && lead.expectedRevenueRange) {
    const [minStr, maxStr] = String(lead.expectedRevenueRange).split(/[-–]/);
    const min = Number((minStr || "").replace(/[^0-9.]/g, ""));
    const max = Number((maxStr || "").replace(/[^0-9.]/g, ""));
    if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
    if (Number.isFinite(min)) return min;
    if (Number.isFinite(max)) return max;
  }
  return 0;
}

const STATUS_PILL_CLASS = {
  New: "bg-sky-50 text-sky-700",
  Contacted: "bg-violet-50 text-violet-700",
  Qualification: "bg-amber-50 text-amber-700",
  "Proposal Shared": "bg-indigo-50 text-indigo-700",
  Negotiation: "bg-emerald-50 text-emerald-700",
  Won: "bg-green-50 text-green-700",
  Lost: "bg-rose-50 text-rose-700",
};

function getStatusPillClasses(status) {
  return STATUS_PILL_CLASS[status] || "bg-slate-100 text-slate-700";
}

function formatRevenueL(value) {
  if (!value) return "—";
  return `₹${(value / 100000).toFixed(1)}L`;
}

export default function LeadTrackingPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const router = useRouter();
  const [lead, setLead] = useState(INITIAL_LEAD);

  const [updates, setUpdates] = useState([]);
  const [updateDraft, setUpdateDraft] = useState({
    text: "",
    date: new Date().toISOString().split("T")[0],
    outcome: "",
    nextFollowUpDate: "",
    statusConfirmation: "",
    links: "",
    risks: "",
    stageChange: "",
    valueChange: "",
  });

  const [errors, setErrors] = useState({});
  const [updateErrors, setUpdateErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadLeads() {
      try {
        setLoading(true);
        setError(null);

        const json = await getApi("lead-tracking", { page: 1, limit: 100 });
        if (!json || json.status !== 1 || !Array.isArray(json.data)) {
          throw new Error(json?.message || "Invalid leads response");
        }

        const mapped = json.data.map((item) => {
          const latestUpdate = Array.isArray(item.lead_updates) && item.lead_updates.length
            ? item.lead_updates[0]
            : null;

          return {
            id: item.id,
            brand: item.brand,
            activityName: item.activity,
            leadOwner: item.full_name || item.username || "Unknown",
            currentStatus: item.current_status || item.stage || "New",
            nextstep: Number(item.nextstep ?? item.next_step ?? 1) || 1,
            nextFollowUpDate:
              (latestUpdate?.next_follow_up_date || item.next_follow_up_date || "")
                ?.slice(0, 10) || "",
            primaryChannel: latestUpdate?.channel || item.lead_source || "",
            nextStep: latestUpdate?.next_action || item.next_step || "",
            cityRegion: item.city_region || "",
            leadSource: item.lead_source || "",
            mode: item.mode || "",
            activityType: item.activity_type || "",
            priority: item.priority || "",
            primaryContactName: item.primary_contact || "",
            phone: item.phone || "",
            email: item.email || "",
            role: item.designation || "",
            decisionMakerName: item.decision_maker || "",
            objective: item.current_status_summary || latestUpdate?.discussion_summary || "",
            activityDate: item.expected_activity_date?.slice?.(0, 10) || "",
            dependencies: latestUpdate?.dependencies || item.dependencies || "",
            expectedRevenueType: "value",
            expectedRevenueValue: item.expected_revenue || "",
            expectedRevenueRange: "",
            expectedExpenses: item.expected_expenses ?? "",
          };
        });

        if (isMounted) {
          setLeads(mapped);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error loading leads", err);
        if (isMounted) {
          setError(err.message || "Failed to load leads");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLeads();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setLead((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleDeliverableToggle = (value) => {
    setLead((prev) => {
      const current = new Set(prev.deliverableTypes);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, deliverableTypes: Array.from(current) };
    });
  };

  const handleUpdateChange = (field) => (e) => {
    const value = e.target.value;
    setUpdateDraft((prev) => ({ ...prev, [field]: value }));
    setUpdateErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateLead = () => {
    const nextErrors = {};

    if (!lead.brand.trim()) nextErrors.brand = "Brand is required.";
    if (!lead.activityName.trim()) nextErrors.activityName = "Activity / campaign name is required.";
    if (!lead.leadOwner.trim()) nextErrors.leadOwner = "Lead owner is required.";
    if (!lead.currentStatus) nextErrors.currentStatus = "Current status is required.";
    if (!lead.nextFollowUpDate) nextErrors.nextFollowUpDate = "Next follow-up date is required.";
    if (!lead.nextStep.trim()) nextErrors.nextStep = "Next step is required.";
    if (!lead.primaryChannel) nextErrors.primaryChannel = "Primary channel is required.";

    if (!lead.primaryContactName.trim()) nextErrors.primaryContactName = "Primary contact name is required.";
    if (!lead.phone.trim() && !lead.email.trim()) {
      nextErrors.phone = "Phone or email is required.";
      nextErrors.email = "Phone or email is required.";
    }
    if (!lead.role.trim()) nextErrors.role = "Role / designation is required.";
    if (!lead.objective.trim()) nextErrors.objective = "Objective is required.";
    if (!lead.deliverableTypes.length) nextErrors.deliverableTypes = "Select at least one deliverable type.";
    if (!lead.activityDate && !(lead.activityWindowFrom && lead.activityWindowTo)) {
      nextErrors.activityDate =
        "Provide either a specific activity date or a date window (from–to).";
    }
    if (!lead.geographyScope.trim()) nextErrors.geographyScope = "Geography / scope summary is required.";

    if (!lead.expectedRevenueType) nextErrors.expectedRevenueType = "Expected revenue type is required.";
    if (lead.expectedRevenueType === "value" && !lead.expectedRevenueValue.trim()) {
      nextErrors.expectedRevenueValue = "Expected revenue value is required.";
    }
    if (lead.expectedRevenueType === "range" && !lead.expectedRevenueRange.trim()) {
      nextErrors.expectedRevenueRange = "Expected revenue range is required.";
    }
    if (!lead.expenseModel) nextErrors.expenseModel = "Expense model is required.";
    if (!lead.paymentTerms) nextErrors.paymentTerms = "Payment terms are required.";
    if (!lead.gstApplicable) nextErrors.gstApplicable = "GST applicability is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateUpdate = () => {
    const nextErrors = {};
    if (!updateDraft.text.trim()) nextErrors.text = "Update text is required.";
    if (!updateDraft.date) nextErrors.date = "Update date is required.";
    if (!updateDraft.outcome) nextErrors.outcome = "Outcome is required.";
    if (!updateDraft.nextFollowUpDate) nextErrors.nextFollowUpDate = "Next follow-up date is required.";
    if (!updateDraft.statusConfirmation) {
      nextErrors.statusConfirmation = "Status confirmation is required.";
    }

    setUpdateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep = () => {
    return validateLead();
  };

  const handleAddUpdate = () => {
    if (!validateUpdate()) return;

    const newUpdate = {
      id: Date.now(),
      ...updateDraft,
    };

    setUpdates((prev) => [newUpdate, ...prev]);
    setUpdateDraft({
      text: "",
      date: new Date().toISOString().split("T")[0],
      outcome: "",
      nextFollowUpDate: "",
      statusConfirmation: "",
      links: "",
      risks: "",
      stageChange: "",
      valueChange: "",
    });
  };

  const handleStartAddLead = () => {
    setLead(INITIAL_LEAD);
    setUpdates([]);
    setUpdateDraft({
      text: "",
      date: new Date().toISOString().split("T")[0],
      outcome: "",
      nextFollowUpDate: "",
      statusConfirmation: "",
      links: "",
      risks: "",
      stageChange: "",
      valueChange: "",
    });
    setErrors({});
    setUpdateErrors({});
    setCurrentStep(1);
    setShowForm(true);
    setSavedMessage("");
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setCurrentStep(1);
  };

  const handleNextStep = () => {
    if (!validateStep()) return;
    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmitLead = () => {
    if (!validateLead()) return;

    const newLead = {
      id: Date.now(),
      ...lead,
      updates,
    };

    setLeads((prev) => [newLead, ...prev]);
    setSavedMessage("Lead added locally. Connect API to persist.");
    setShowForm(false);
    setCurrentStep(1);
  };

  const revenueByLeadId = useMemo(() => {
    const map = new Map();
    for (const l of leads) {
      map.set(l.id, parseRevenue(l));
    }
    return map;
  }, [leads]);

  const totalLeads = leads.length;

  const totalPipeline = useMemo(() => {
    let sum = 0;
    for (const v of revenueByLeadId.values()) sum += v;
    return sum;
  }, [revenueByLeadId]);

  const activeLeads = useMemo(
    () => leads.filter((l) => l.currentStatus !== "Won" && l.currentStatus !== "Lost"),
    [leads]
  );

  const next7Days = useMemo(() => {
    if (!leads.length) return [];
    const today = new Date();
    return leads.filter((l) => {
      if (!l.nextFollowUpDate) return false;
      const target = new Date(l.nextFollowUpDate);
      const diffDays = (target - today) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [leads]);

  const statusCounts = useMemo(() => {
    const acc = Object.fromEntries(STATUS_OPTIONS.map((s) => [s, 0]));
    for (const l of leads) {
      const s = l.currentStatus;
      if (s && Object.prototype.hasOwnProperty.call(acc, s)) acc[s] += 1;
    }
    return acc;
  }, [leads]);

  const byOwnerChartData = useMemo(() => {
    const owners = new Map();
    for (const l of leads) {
      const key = l.leadOwner || "Unknown";
      const current = owners.get(key) || { owner: key, leads: 0, value: 0 };
      current.leads += 1;
      current.value += revenueByLeadId.get(l.id) || 0;
      owners.set(key, current);
    }
    return Array.from(owners.values());
  }, [leads, revenueByLeadId]);

  const statusChartData = useMemo(
    () => STATUS_OPTIONS.map((status) => ({ status, count: statusCounts[status] || 0 })),
    [statusCounts]
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Lead Tracking
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            First see all leads and health, then add structured leads in a guided flow.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {savedMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800 shadow-sm">
              {savedMessage}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              useLeadFormStore.getState().closeLeadForm();
              router.push("/leads/new");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add lead
          </button>
        </div>
      </div>

      {/* Top: quick health cards */}
      {loading ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-5 text-white shadow-lg shadow-indigo-500/30">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100/90">
              Total leads
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">{totalLeads}</p>
            <p className="mt-1 text-xs text-indigo-100/90">
              {activeLeads.length} currently active in pipeline
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/70 ring-1 ring-slate-200/90">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-100" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Pipeline (approx.)
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              ₹{(totalPipeline / 100000).toFixed(1)}L
            </p>
            <p className="mt-1 text-xs text-slate-500">Based on expected revenue fields</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/70 ring-1 ring-slate-200/90">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Follow-ups next 7 days
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {next7Days.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Keep these hot leads moving
            </p>
          </div>
        </section>
      )}

      {/* Comparison graphs */}
      {loading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Owner vs pipeline
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Approx. value per lead owner
                </p>
              </div>
            </div>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byOwnerChartData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="owner"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(79,70,229,0.03)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-slate-900">{label}</p>
                          <p className="mt-1 text-slate-600">
                            Leads:{" "}
                            <span className="font-semibold text-slate-900">{row.leads}</span>
                          </p>
                          <p className="text-slate-600">
                            Pipeline:{" "}
                            <span className="font-semibold text-slate-900">
                              ₹{(row.value / 100000).toFixed(1)}L
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Leads by status
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Where deals are in the funnel
                </p>
              </div>
            </div>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(129,140,248,0.06)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-slate-900">{row.status}</p>
                          <p className="mt-1 text-slate-600">
                            Leads:{" "}
                            <span className="font-semibold text-slate-900">{row.count}</span>
                          </p>
                        </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      )}

      {/* Leads table */}
      <section className="rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">All leads</p>
            {loading && (
              <p className="text-xs text-slate-400">
                Syncing from API…
              </p>
            )}
            {error && !loading && (
              <p className="text-xs text-rose-500">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Brand</th>
                <th className="px-4 py-2.5">Activity</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Next follow-up</th>
                <th className="px-4 py-2.5">Channel</th>
                <th className="px-4 py-2.5">Region</th>
                <th className="px-4 py-2.5 text-right">Est. value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-3.5 w-24 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 w-40 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 w-28 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-24 rounded-full bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 w-24 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 w-20 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 w-32 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-3.5 w-16 rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    No leads yet. Click &quot;Add lead&quot; to create your first one.
                  </td>
                </tr>
              ) : (
                leads.map((row) => {
                  const approxRevenue = revenueByLeadId.get(row.id) || 0;
                  const status = row.currentStatus || "New";
                  const colorClasses = getStatusPillClasses(status);
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        useLeadFormStore.getState().openLeadForm(row);
                        router.push("/leads/new");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          useLeadFormStore.getState().openLeadForm(row);
                          router.push("/leads/new");
                        }
                      }}
                      className="hover:bg-slate-50/60 text-[13px] cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-slate-900">{row.brand}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.activityName}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.leadOwner}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colorClasses}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {row.nextFollowUpDate || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {row.primaryChannel || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {row.cityRegion || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-800">
                        {formatRevenueL(approxRevenue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Step-wise add lead form */}
      {showForm && (
        <section className="space-y-5 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/80 ring-1 ring-indigo-100">
          {/* Stepper header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
              New lead flow
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Capture lead in 5 quick steps
            </h2>
          </div>

          <div className="relative mt-3">
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200" />
            <ol className="relative z-10 flex justify-between gap-2">
              {STEP_DEFINITIONS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <li key={step.id} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-400/60"
                          : isCompleted
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-400/60"
                            : "bg-white text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {step.id}
                    </div>
                    <p
                      className={`text-[11px] font-medium ${
                        isActive
                          ? "text-indigo-700"
                          : isCompleted
                            ? "text-emerald-700"
                            : "text-slate-500"
                      }`}
                    >
                      {step.title}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Step content */}
          <div className="mt-4 space-y-6">
            {/* Step 1 */}
            {currentStep === 1 && (
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Step 1 · Lead basics</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Where is the lead coming from and who owns it.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Brand <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lead.brand}
                  onChange={handleChange("brand")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Brand / client name"
                />
                {errors.brand && <p className="mt-1 text-xs text-rose-600">{errors.brand}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Activity / Campaign name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lead.activityName}
                  onChange={handleChange("activityName")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="E.g. Summer esports campaign"
                />
                {errors.activityName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.activityName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Lead owner <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lead.leadOwner}
                  onChange={handleChange("leadOwner")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Who is driving this?"
                />
                {errors.leadOwner && (
                  <p className="mt-1 text-xs text-rose-600">{errors.leadOwner}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Current status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={lead.currentStatus}
                  onChange={handleChange("currentStatus")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select status</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.currentStatus && (
                  <p className="mt-1 text-xs text-rose-600">{errors.currentStatus}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Next follow-up date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={lead.nextFollowUpDate}
                  onChange={handleChange("nextFollowUpDate")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.nextFollowUpDate && (
                  <p className="mt-1 text-xs text-rose-600">{errors.nextFollowUpDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Next step <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lead.nextStep}
                  onChange={handleChange("nextStep")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="E.g. share creds, draft proposal, schedule call"
                />
                {errors.nextStep && <p className="mt-1 text-xs text-rose-600">{errors.nextStep}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Primary channel <span className="text-rose-500">*</span>
                </label>
                <select
                  value={lead.primaryChannel}
                  onChange={handleChange("primaryChannel")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select channel</option>
                  {PRIMARY_CHANNELS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.primaryChannel && (
                  <p className="mt-1 text-xs text-rose-600">{errors.primaryChannel}</p>
                )}
              </div>

              {/* Optional basics */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Lead source
                </label>
                <input
                  type="text"
                  value={lead.leadSource}
                  onChange={handleChange("leadSource")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Inbound, referral, event, cold outreach..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  City / region
                </label>
                <input
                  type="text"
                  value={lead.cityRegion}
                  onChange={handleChange("cityRegion")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Primary geography of brand / activity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Mode
                </label>
                <input
                  type="text"
                  value={lead.mode}
                  onChange={handleChange("mode")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Online / offline / hybrid"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Activity type
                </label>
                <input
                  type="text"
                  value={lead.activityType}
                  onChange={handleChange("activityType")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="E.g. launch, evergreen, test, renewal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  value={lead.priority}
                  onChange={handleChange("priority")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={lead.tags}
                      onChange={handleChange("tags")}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Comma-separated tags for quick filtering"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Step 2 · Contacts &amp; stakeholders
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Capture all key people for this deal.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Primary contact name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lead.primaryContactName}
                  onChange={handleChange("primaryContactName")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Main point of contact"
                />
                {errors.primaryContactName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.primaryContactName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={lead.phone}
                  onChange={handleChange("phone")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="+91..."
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={lead.email}
                  onChange={handleChange("email")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="name@brand.com"
                />
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role / designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lead.role}
                  onChange={handleChange("role")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Brand manager, marketing head..."
                />
                {errors.role && <p className="mt-1 text-xs text-rose-600">{errors.role}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Decision maker known? <span className="text-rose-500">*</span>
                </label>
                <div className="mt-1 flex gap-3">
                  {["Yes", "No"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLead((prev) => ({ ...prev, decisionMakerKnown: value }))}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                        lead.decisionMakerKnown === value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional contacts */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Decision maker name
                </label>
                <input
                  type="text"
                  value={lead.decisionMakerName}
                  onChange={handleChange("decisionMakerName")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Decision maker role
                </label>
                <input
                  type="text"
                  value={lead.decisionMakerRole}
                  onChange={handleChange("decisionMakerRole")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Procurement contact
                </label>
                <input
                  type="text"
                  value={lead.procurementContact}
                  onChange={handleChange("procurementContact")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Agency involved
                </label>
                <input
                  type="text"
                  value={lead.agencyInvolved}
                  onChange={handleChange("agencyInvolved")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="If working via an agency"
                />
              </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Preferred contact time
                    </label>
                    <input
                      type="text"
                      value={lead.preferredContactTime}
                      onChange={handleChange("preferredContactTime")}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="E.g. Weekdays 3–6 PM IST"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Step 3 · Requirements &amp; plan
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    What exactly are we delivering and when.
                  </p>
                </div>

                <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Objective <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={lead.objective}
                  onChange={handleChange("objective")}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="What is the brand trying to achieve?"
                />
                {errors.objective && (
                  <p className="mt-1 text-xs text-rose-600">{errors.objective}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Deliverable types <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DELIVERABLE_TYPES.map((type) => {
                    const active = lead.deliverableTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleDeliverableToggle(type)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          active
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
                {errors.deliverableTypes && (
                  <p className="mt-1 text-xs text-rose-600">{errors.deliverableTypes}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Specific activity date
                  </label>
                  <input
                    type="date"
                    value={lead.activityDate}
                    onChange={handleChange("activityDate")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Window from
                  </label>
                  <input
                    type="date"
                    value={lead.activityWindowFrom}
                    onChange={handleChange("activityWindowFrom")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Window to
                  </label>
                  <input
                    type="date"
                    value={lead.activityWindowTo}
                    onChange={handleChange("activityWindowTo")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {errors.activityDate && (
                <p className="text-xs text-rose-600">
                  {errors.activityDate}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Geography / scope summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={lead.geographyScope}
                  onChange={handleChange("geographyScope")}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="E.g. India-wide, Tier 1 only, key campuses, etc."
                />
                {errors.geographyScope && (
                  <p className="mt-1 text-xs text-rose-600">{errors.geographyScope}</p>
                )}
              </div>

              {/* Optional requirements */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Participants estimate
                  </label>
                  <input
                    type="text"
                    value={lead.participantsEstimate}
                    onChange={handleChange("participantsEstimate")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="E.g. 500–800 players"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Game titles
                  </label>
                  <input
                    type="text"
                    value={lead.gameTitles}
                    onChange={handleChange("gameTitles")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="BGMI, Valorant, etc."
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Integrations
                  </label>
                  <textarea
                    value={lead.integrations}
                    onChange={handleChange("integrations")}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Branding, product placement, in-game, influencer tie-ups..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Success metrics
                  </label>
                  <textarea
                    value={lead.successMetrics}
                    onChange={handleChange("successMetrics")}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Signups, reach, engagement, installs, etc."
                  />
                </div>
              </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Dependencies
                    </label>
                    <textarea
                      value={lead.dependencies}
                      onChange={handleChange("dependencies")}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Internal approvals, tech dependencies, brand assets, etc."
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Step 4 · Commercials</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Rough commercials so everyone knows deal size.
                  </p>
                </div>

                <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1.3fr,1.7fr]">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Expected revenue <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-2 flex gap-2">
                    {[
                      { key: "value", label: "Value" },
                      { key: "range", label: "Range" },
                      { key: "tbd", label: "TBD" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() =>
                          setLead((prev) => ({ ...prev, expectedRevenueType: option.key }))
                        }
                        className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
                          lead.expectedRevenueType === option.key
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {errors.expectedRevenueType && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.expectedRevenueType}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {lead.expectedRevenueType === "value" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Value (₹)
                      </label>
                      <input
                        type="text"
                        value={lead.expectedRevenueValue}
                        onChange={handleChange("expectedRevenueValue")}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="E.g. 8,00,000"
                      />
                      {errors.expectedRevenueValue && (
                        <p className="mt-1 text-xs text-rose-600">
                          {errors.expectedRevenueValue}
                        </p>
                      )}
                    </div>
                  )}
                  {lead.expectedRevenueType === "range" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Range (₹)
                      </label>
                      <input
                        type="text"
                        value={lead.expectedRevenueRange}
                        onChange={handleChange("expectedRevenueRange")}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="E.g. 6–10L"
                      />
                      {errors.expectedRevenueRange && (
                        <p className="mt-1 text-xs text-rose-600">
                          {errors.expectedRevenueRange}
                        </p>
                      )}
                    </div>
                  )}
                  {lead.expectedRevenueType === "tbd" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={lead.expectedRevenueNote}
                        onChange={handleChange("expectedRevenueNote")}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Why TBD / how will it be decided?"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Expense model <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={lead.expenseModel}
                    onChange={handleChange("expenseModel")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select model</option>
                    {EXPENSE_MODELS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.expenseModel && (
                    <p className="mt-1 text-xs text-rose-600">{errors.expenseModel}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Payment terms <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={lead.paymentTerms}
                    onChange={handleChange("paymentTerms")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select terms</option>
                    {PAYMENT_TERMS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="Custom">Custom</option>
                  </select>
                  {errors.paymentTerms && (
                    <p className="mt-1 text-xs text-rose-600">{errors.paymentTerms}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    GST applicable? <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1 flex gap-3">
                    {["Yes", "No"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLead((prev) => ({ ...prev, gstApplicable: value }))}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                          lead.gstApplicable === value
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  {errors.gstApplicable && (
                    <p className="mt-1 text-xs text-rose-600">{errors.gstApplicable}</p>
                  )}
                </div>
              </div>

              {/* Optional commercials */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Expected expenses
                  </label>
                  <input
                    type="text"
                    value={lead.expectedExpenses}
                    onChange={handleChange("expectedExpenses")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Rough cost estimate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Revenue model
                  </label>
                  <input
                    type="text"
                    value={lead.revenueModel}
                    onChange={handleChange("revenueModel")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="How will revenue be realized?"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Invoice entity
                  </label>
                  <input
                    type="text"
                    value={lead.invoiceEntity}
                    onChange={handleChange("invoiceEntity")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Which entity will raise invoice?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Discount / special terms
                  </label>
                  <input
                    type="text"
                    value={lead.discountTerms}
                    onChange={handleChange("discountTerms")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Dependencies
                    </label>
                    <textarea
                      value={lead.dependencies}
                      onChange={handleChange("dependencies")}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Internal approvals, tech dependencies, brand assets, etc."
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 5 - updates log within flow */}
            {currentStep === 5 && (
              <section className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Step 5 · First update (optional)
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Add a quick note from the latest conversation. You can always add more later.
                  </p>
                </div>

                {/* We reuse the existing update form and list here */}
                {/* Add update form */}
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  {/* ... existing update fields ... */}
                </div>
              </section>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                Step {currentStep} of {STEP_DEFINITIONS.length}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              {currentStep < STEP_DEFINITIONS.length && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Next step
                </button>
              )}
              {currentStep === STEP_DEFINITIONS.length && (
                <button
                  type="button"
                  onClick={handleSubmitLead}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Save lead
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

