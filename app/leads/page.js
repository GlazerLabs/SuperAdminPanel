"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from "recharts";
import { getApi, deleteApi } from "@/api";
import { useLeadFormStore } from "@/zustand/leadForm";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const ENTRIES_OPTIONS = [10, 20, 50, 100];
const STATS_FETCH_LIMIT = 500;

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualification",
  "Proposal Shared",
  "Negotiation",
  "Hold",
  "Meeting Schedule",
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

function formatContactName(value) {
  if (Array.isArray(value)) {
    const first = value.find((v) => String(v || "").trim());
    return first ? String(first).trim() : "";
  }
  return value ? String(value).trim() : "";
}

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

function getLatestUpdate(updates) {
  if (!Array.isArray(updates) || updates.length === 0) return null;
  return [...updates].sort((a, b) => {
    const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
    if (at !== bt) return bt - at;
    return Number(b?.id || 0) - Number(a?.id || 0);
  })[0];
}

function mapApiLead(item) {
  const latestUpdate = getLatestUpdate(item.lead_updates);

  return {
    ...item,
    id: item.id,
    brand: item.brand,
    activityName: item.activity,
    leadOwner: item.full_name || item.username || "Unknown",
    currentStatus: item.current_status || item.stage || "New",
    nextstep: Number(item.nextstep ?? item.next_step ?? 1) || 1,
    nextFollowUpDate:
      (latestUpdate?.next_follow_up_date || item.next_follow_up_date || "")?.slice(0, 10) || "",
    primaryChannel: latestUpdate?.channel || item.lead_source || "",
    nextStep: latestUpdate?.next_action || item.next_step || "",
    cityRegion: item.city_region || "",
    leadSource: item.lead_source || "",
    mode: item.mode || "",
    activityType: item.activity_type || "",
    priority: item.priority || "",
    primaryContactName: formatContactName(item.primary_contact),
    phone: item.phone || "",
    email: item.email || "",
    role: item.designation || "",
    agencyInvolved: item.agency_involved || "",
    decisionMakerName: item.decision_maker || "",
    objective: item.current_status_summary || latestUpdate?.discussion_summary || "",
    activityDate: item.expected_activity_date?.slice?.(0, 10) || "",
    dependencies: latestUpdate?.dependencies || item.dependencies || "",
    expectedRevenueType: "value",
    expectedRevenueValue: latestUpdate?.value_after ?? item.expected_revenue ?? "",
    expectedRevenueRange: "",
    expectedExpenses: latestUpdate?.expense_after ?? item.expected_expenses ?? "",
  };
}

function extractLeadsTotal(json, rowsLength) {
  return (
    Number(json?.total) ||
    Number(json?.count) ||
    Number(json?.meta?.total) ||
    Number(json?.pagination?.total) ||
    Number(json?.data?.total) ||
    rowsLength
  );
}

const STATUS_PILL_CLASS = {
  New: "bg-sky-50 text-sky-700",
  Contacted: "bg-violet-50 text-violet-700",
  Qualification: "bg-amber-50 text-amber-700",
  "Proposal Shared": "bg-indigo-50 text-indigo-700",
  Negotiation: "bg-emerald-50 text-emerald-700",
  Hold: "bg-orange-50 text-orange-700",
  "Meeting Schedule": "bg-cyan-50 text-cyan-700",
  Won: "bg-green-50 text-green-700",
  Lost: "bg-rose-50 text-rose-700",
};

function getStatusPillClasses(status) {
  return STATUS_PILL_CLASS[status] || "bg-slate-100 text-slate-700";
}

function formatCompactIndian(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";

  const absNum = Math.abs(num);
  const formatUnit = (divisor, suffix) => {
    const scaled = num / divisor;
    return `${scaled.toFixed(2)}${suffix}`;
  };

  if (absNum >= 10000000) return formatUnit(10000000, "Cr");
  if (absNum >= 100000) return formatUnit(100000, "L");
  if (absNum >= 1000) return formatUnit(1000, "K");
  return String(Math.round(num));
}

function formatRevenue(value) {
  if (!value) return "—";
  return `₹${formatCompactIndian(value)}`;
}

function toAgencyPocChartData(payload) {
  const agencies = Array.isArray(payload?.agency) ? payload.agency : [];
  const pocs = Array.isArray(payload?.normal_poc) ? payload.normal_poc : [];

  const agencyRows = agencies.map((row, index) => {
    const totalLeads = Number(row?.total_leads ?? 0);
    const totalRevenue = Number(row?.total_revenue ?? 0);
    const name = String(row?.name || "").trim() || `Agency ${index + 1}`;
    return {
      id: `agency-${index}-${name}`,
      label: `${name} (Agency)`,
      name,
      kind: "Agency",
      total: Number.isFinite(totalLeads) ? totalLeads : 0,
      revenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
    };
  });

  const pocRows = pocs.map((row, index) => {
    const totalLeads = Number(row?.total_leads ?? 0);
    const totalRevenue = Number(row?.total_revenue ?? 0);
    const name = String(row?.name || "").trim() || `POC ${index + 1}`;
    return {
      id: `poc-${index}-${name}`,
      label: `${name} (POC)`,
      name,
      kind: "POC",
      total: Number.isFinite(totalLeads) ? totalLeads : 0,
      revenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
    };
  });

  return [...agencyRows, ...pocRows].filter((row) => row.total > 0);
}

export default function LeadTrackingPage() {
  const [leads, setLeads] = useState([]);
  const [statsLeads, setStatsLeads] = useState([]);
  const [statusCountsFromApi, setStatusCountsFromApi] = useState(null);
  const [agencyPocChartData, setAgencyPocChartData] = useState([]);
  const [totalLeadsFromApi, setTotalLeadsFromApi] = useState(null);
  const [totalRevenueFromApi, setTotalRevenueFromApi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_LIMIT);
  const [totalCount, setTotalCount] = useState(0);
  const [canGoNext, setCanGoNext] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchLead, setSearchLead] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [followUpWindowActive, setFollowUpWindowActive] = useState(false);

  const router = useRouter();
  const [tableSectionEl, setTableSectionEl] = useState(null);
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
  const [deletingLeadId, setDeletingLeadId] = useState(null);

  const handleDeleteLead = async (e, leadId, leadBrand) => {
    e.stopPropagation();
    if (!leadId || deletingLeadId) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${leadBrand || `Lead #${leadId}`}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingLeadId(leadId);
    try {
      await deleteApi(`lead-tracking/${leadId}`);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setStatsLeads((prev) => prev.filter((l) => l.id !== leadId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setRefreshSeed((s) => s + 1);
      setSavedMessage("Lead deleted successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert(err?.message || "Failed to delete lead. Please try again.");
    } finally {
      setDeletingLeadId(null);
    }
  };

  const loadStatsLeads = useCallback(async (isMountedRef) => {
    try {
      setStatsLoading(true);
      const json = await getApi("lead-tracking", { page: 1, limit: STATS_FETCH_LIMIT });
      if (!json || json.status !== 1 || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Invalid leads response");
      }
      let agencyTotalJson = null;
      try {
        agencyTotalJson = await getApi("lead-tracking/agency-total");
      } catch (agencyErr) {
        // eslint-disable-next-line no-console
        console.error("Error loading agency totals", agencyErr);
      }
      if (isMountedRef.current) {
        setStatsLeads(json.data.map(mapApiLead));
        setStatusCountsFromApi(
          json.current_status_counts && typeof json.current_status_counts === "object"
            ? json.current_status_counts
            : null
        );
        setTotalLeadsFromApi(Number.isFinite(Number(json.total)) ? Number(json.total) : null);
        setTotalRevenueFromApi(
          Number.isFinite(Number(json.total_revenue)) ? Number(json.total_revenue) : null
        );
        setAgencyPocChartData(toAgencyPocChartData(agencyTotalJson));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading lead stats", err);
    } finally {
      if (isMountedRef.current) setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    loadStatsLeads(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [refreshSeed, loadStatsLeads]);

  useEffect(() => {
    let isMounted = true;

    async function loadLeads() {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const end = new Date(today);
        end.setDate(end.getDate() + 7);
        const formatDate = (d) => d.toISOString().slice(0, 10);

        const json = await getApi("lead-tracking", {
          page: currentPage,
          limit: entriesPerPage,
          ...(searchLead.trim() ? { search: searchLead.trim() } : {}),
          ...(priorityFilter ? { priority: priorityFilter } : {}),
          ...(followUpWindowActive
            ? {
                start_date: formatDate(today),
                end_date: formatDate(end),
              }
            : {}),
        });
        if (!json || json.status !== 1 || !Array.isArray(json.data)) {
          throw new Error(json?.message || "Invalid leads response");
        }

        const mapped = json.data.map(mapApiLead);
        const metaTotal = extractLeadsTotal(json, mapped.length);

        if (isMounted) {
          setLeads(mapped);
          setTotalCount(metaTotal);
          setCanGoNext(
            metaTotal > 0
              ? currentPage * entriesPerPage < metaTotal
              : mapped.length === entriesPerPage
          );
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
  }, [currentPage, entriesPerPage, refreshSeed, searchLead, priorityFilter, followUpWindowActive]);

  useEffect(() => {
    setCurrentPage(DEFAULT_PAGE);
  }, [searchLead, priorityFilter, followUpWindowActive]);

  const handleFollowUpsCardClick = () => {
    setFollowUpWindowActive(true);
    setCurrentPage(DEFAULT_PAGE);
    tableSectionEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  const statsRevenueByLeadId = useMemo(() => {
    const map = new Map();
    for (const l of statsLeads) {
      map.set(l.id, parseRevenue(l));
    }
    return map;
  }, [statsLeads]);

  // CSV export for the current table view.
  // Uses the exact numeric "Est. value" (no ₹, no Cr/Lakh compact formatting).
  const downloadLeadsCsv = () => {
    if (!Array.isArray(leads) || leads.length === 0) return;

    const csvEscape = (val) => {
      const s = val === undefined || val === null ? "" : String(val);
      // Escape CSV values that contain commas, quotes, or new lines.
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = ["Lead name", "Est. value"];
    const rows = leads.map((row) => {
      const leadName = row.brand || row.activityName || `Lead-${row.id}`;
      const estValue = revenueByLeadId.get(row.id) ?? 0; // raw rupee number
      return [leadName, estValue];
    });

    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-est-value-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalLeads = totalLeadsFromApi ?? totalCount ?? statsLeads.length;

  const totalPipeline = useMemo(() => {
    if (totalRevenueFromApi !== null) return totalRevenueFromApi;
    let sum = 0;
    for (const l of statsLeads) {
      if (l.currentStatus === "Lost") continue;
      sum += statsRevenueByLeadId.get(l.id) || 0;
    }
    return sum;
  }, [totalRevenueFromApi, statsLeads, statsRevenueByLeadId]);

  const activeLeads = useMemo(
    () =>
      statsLeads.filter((l) => l.currentStatus !== "Won" && l.currentStatus !== "Lost"),
    [statsLeads]
  );

  const next7Days = useMemo(() => {
    if (!statsLeads.length) return [];
    const today = new Date();
    return statsLeads.filter((l) => {
      if (!l.nextFollowUpDate) return false;
      const target = new Date(l.nextFollowUpDate);
      const diffDays = (target - today) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [statsLeads]);

  const statusCountsFallback = useMemo(() => {
    const acc = Object.fromEntries(STATUS_OPTIONS.map((s) => [s, 0]));
    for (const l of statsLeads) {
      const s = l.currentStatus;
      if (s && Object.prototype.hasOwnProperty.call(acc, s)) acc[s] += 1;
    }
    return acc;
  }, [statsLeads]);

  const agencyPocChartDataFallback = useMemo(() => {
    const owners = new Map();
    for (const l of statsLeads) {
      const key = l.leadOwner || "Unknown";
      const current = owners.get(key) || { id: key, label: `${key} (POC)`, name: key, kind: "POC", total: 0, revenue: 0 };
      current.total += 1;
      owners.set(key, current);
    }
    return Array.from(owners.values());
  }, [statsLeads]);

  const agencyPocData = agencyPocChartData.length > 0 ? agencyPocChartData : agencyPocChartDataFallback;

  const startIndex = leads.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endIndex = (currentPage - 1) * entriesPerPage + leads.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / entriesPerPage) : null;
  const visiblePages = useMemo(() => {
    const windowSize = 7;

    if (totalPages) {
      let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
      let end = Math.min(totalPages, start + windowSize - 1);
      start = Math.max(1, end - windowSize + 1);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    let start = Math.max(1, currentPage - 3);
    let end = start + windowSize - 1;

    if (!canGoNext) {
      end = currentPage;
      start = Math.max(1, end - windowSize + 1);
    }

    if (currentPage < start) start = currentPage;
    if (currentPage > end) end = currentPage;

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, currentPage, canGoNext]);

  const statusChartData = useMemo(() => {
    if (statusCountsFromApi && Object.keys(statusCountsFromApi).length > 0) {
      return Object.entries(statusCountsFromApi).map(([status, count]) => ({
        status: status === "unknown" ? "Unknown" : status,
        count: Number(count) || 0,
      }));
    }

    return STATUS_OPTIONS.map((status) => ({
      status,
      count: statusCountsFallback[status] || 0,
    }));
  }, [statusCountsFromApi, statusCountsFallback]);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Lead Tracking
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Click a row for the lead overview, timeline, and follow-ups. Use <span className="font-medium text-slate-800">Edit</span> for the
            multi-step editor.
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
              useLeadFormStore.getState().clearLeadFlowState();
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
      {loading || statsLoading ? (
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
              {formatRevenue(totalPipeline)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {totalRevenueFromApi !== null
                ? "Based on backend pipeline totals"
                : "Based on expected revenue fields"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleFollowUpsCardClick}
            className="relative overflow-hidden rounded-2xl bg-white p-5 text-left shadow-md shadow-slate-200/70 ring-1 ring-slate-200/90 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Follow-ups next 7 days
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {next7Days.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Keep these hot leads moving
            </p>
          </button>
        </section>
      )}

      {/* Comparison graphs */}
      {loading || statsLoading ? (
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
                  Agency & POC
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Lead totals from agency-total API
                </p>
              </div>
            </div>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agencyPocData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} width={40} />
                  <Tooltip
                    cursor={{ fill: "rgba(79,70,229,0.03)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-slate-900">{row.name}</p>
                          <p className="mt-1 text-slate-600">
                            Type: <span className="font-semibold text-slate-900">{row.kind}</span>
                          </p>
                          <p className="text-slate-600">
                            Leads: <span className="font-semibold text-slate-900">{row.total}</span>
                          </p>
                          <p className="text-slate-600">
                            Revenue: <span className="font-semibold text-slate-900">{formatRevenue(row.revenue)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="total"
                      position="top"
                      fill="#0f172a"
                      fontSize={11}
                      fontWeight={600}
                    />
                  </Bar>
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
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill="#0f172a"
                    fontSize={11}
                    fontWeight={600}
                    formatter={(value) => (value > 0 ? value : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      )}

      {/* Leads table */}
      <section
        ref={setTableSectionEl}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-sm font-medium text-slate-800">All leads</p>
          <input
            type="text"
            value={searchLead}
            onChange={(e) => setSearchLead(e.target.value)}
            placeholder="Search lead..."
            className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
          >
            <option value="">All priority</option>
            <option value="Hot">Hot</option>
            <option value="Cold">Cold</option>
            <option value="Not Interested">Not Interested</option>
          </select>
          {followUpWindowActive && (
            <button
              type="button"
              onClick={() => setFollowUpWindowActive(false)}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
            >
              Next 7 days filter active (clear)
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(DEFAULT_PAGE);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
            >
              {ENTRIES_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-600">entries</span>
          </div>
          {loading && <p className="ml-auto text-xs text-slate-400">Syncing from API…</p>}
          {error && !loading && (
            <p className="ml-auto text-xs text-rose-500">{error}</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-indigo-200/60 bg-indigo-50/80">
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Lead ID</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Brand</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Activity</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Owner</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Status</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Next follow-up</th>
                <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Lead Source</th>
                {/* <th className="px-4 py-3.5 text-sm font-semibold text-indigo-900">Region</th> */}
                <th className="px-4 py-3.5 text-right text-sm font-semibold text-indigo-900">Est. value</th>
                {/* <th className="w-28 px-4 py-3.5 text-right text-sm font-semibold text-indigo-900">Actions</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: entriesPerPage > 10 ? 10 : entriesPerPage }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-b border-slate-100">
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-24 rounded-full bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded bg-slate-100" />
                    </td>
                    {/* <td className="px-4 py-3">
                      <div className="h-4 w-32 rounded bg-slate-100" />
                    </td> */}
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-16 rounded bg-slate-100" />
                    </td>
                    {/* <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-8 w-14 rounded-lg bg-slate-100" />
                    </td> */}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
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
                      onClick={() => router.push(`/leads/${row.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/leads/${row.id}`);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 text-sm transition-colors hover:bg-slate-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700 tabular-nums">
                        {row.lead_id != null && String(row.lead_id).trim() !== ""
                          ? row.lead_id
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.brand}</td>
                      <td className="px-4 py-3 text-slate-700">{row.activityName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.leadOwner}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colorClasses}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.nextFollowUpDate || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.leadSource || "—"}
                      </td>
                      {/* <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.cityRegion || "—"}
                      </td> */}
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">
                        {formatRevenue(approxRevenue)}
                      </td>
                      {/* <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Edit lead in multi-step editor"
                            aria-label="Edit lead"
                            onClick={(e) => {
                              e.stopPropagation();
                              useLeadFormStore.getState().openLeadForm(row);
                              router.push("/leads/new");
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50/70 text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Delete lead"
                            aria-label="Delete lead"
                            disabled={deletingLeadId === row.id}
                            onClick={(e) => handleDeleteLead(e, row.id, row.brand || row.activityName)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/70 text-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
                          >
                            {deletingLeadId === row.id ? (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-sm text-slate-600">
            {totalCount > 0 ? (
              <>
                Showing {startIndex} to {endIndex} of {totalCount} entries
              </>
            ) : (
              <>
                Showing {startIndex} to {endIndex}
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                disabled={loading}
                className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  p === currentPage
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!canGoNext || loading || (totalPages ? currentPage >= totalPages : false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
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
                  Primary channel
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
                  Lead Status
                </label>
                <select
                  value={lead.priority}
                  onChange={handleChange("priority")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select lead status</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                  <option value="Not Interested">Not Interested</option>
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
                    Expense model
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
                    Payment terms
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

