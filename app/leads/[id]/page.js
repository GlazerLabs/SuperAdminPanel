"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getApi, patchApi, putApi } from "@/api";
import { parseIndianRupeeInput } from "@/lib/parseIndianRupee";
import { rowToInitialLead, useLeadFormStore } from "@/zustand/leadForm";

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualification",
  "Proposal Shared",
  "Negotiation",
  "Won",
  "Lost",
];

const CHANNEL_OPTIONS = ["Email", "Phone", "Call", "WhatsApp", "In-person", "Social", "Website", "Referral", "Other"];

const UPDATE_TYPES = ["Follow-up", "Meeting", "Proposal", "Negotiation", "Closure", "Expense", "Other"];

const SENTIMENT_OPTIONS = ["Positive", "Neutral", "Negative", "Not discussed"];

const OUTCOME_OPTIONS = [
  "Progressed",
  "No change",
  "Blocked",
  "Client requested proposal",
  "Closed won",
  "Closed lost",
  "Other",
];

const STATUS_PILL_CLASS = {
  New: "bg-sky-50 text-sky-800 ring-sky-100",
  Contacted: "bg-violet-50 text-violet-800 ring-violet-100",
  Qualification: "bg-amber-50 text-amber-900 ring-amber-100",
  "Proposal Shared": "bg-indigo-50 text-indigo-800 ring-indigo-100",
  Negotiation: "bg-emerald-50 text-emerald-900 ring-emerald-100",
  Won: "bg-green-50 text-green-800 ring-green-100",
  Lost: "bg-rose-50 text-rose-800 ring-rose-100",
};

function pillClass(status) {
  return STATUS_PILL_CLASS[status] || "bg-slate-100 text-slate-700 ring-slate-200";
}

function sentimentClass(s) {
  if (s === "Positive") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "Negative") return "bg-rose-50 text-rose-800 ring-rose-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function formatMoney(n) {
  if (n === undefined || n === null || n === "") return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  const absNum = Math.abs(num);
  const formatUnit = (divisor, suffix) => {
    const scaled = num / divisor;
    const rounded = Number(scaled.toFixed(1));
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}${suffix}`;
  };

  if (absNum >= 10000000) return `₹${formatUnit(10000000, "Cr")}`;
  if (absNum >= 100000) return `₹${formatUnit(100000, "L")}`;
  if (absNum >= 1000) return `₹${formatUnit(1000, "K")}`;
  return `₹${Math.round(num)}`;
}

/** Spend (e.g. sum of payments) vs total expense budget from follow-up / record. */
function getSpendVsBudgetColorClass(spentAmount, totalExpenseBudget) {
  const spent = Number(spentAmount || 0);
  const budget = Number(totalExpenseBudget || 0);
  if (budget <= 0) {
    if (spent > 0) return "text-rose-300 hover:text-rose-200";
    return "text-emerald-300 hover:text-emerald-200";
  }
  if (spent > budget) return "text-rose-300 hover:text-rose-200";
  if (spent >= budget * 0.9) return "text-amber-300 hover:text-amber-200";
  return "text-emerald-300 hover:text-emerald-200";
}

function textWithBreaks(v) {
  if (v === undefined || v === null) return "—";
  const cleaned = String(v).replace(/\\n/g, "\n").trim();
  return cleaned || "—";
}

function sliceDate(v) {
  if (!v) return "";
  const s = String(v);
  return s.slice(0, 10);
}

function parseLeadFromApi(json, id) {
  if (!json || json.status !== 1) return null;
  const d = json.data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d;
  if (Array.isArray(d)) {
    return d.find((x) => String(x?.id) === String(id)) || d[0] || null;
  }
  return null;
}

function sortUpdates(updates) {
  if (!Array.isArray(updates)) return [];
  return [...updates].sort((a, b) => {
    const ca = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    if (ca !== cb) return cb - ca;
    const da = sliceDate(a.update_date) || "";
    const db = sliceDate(b.update_date) || "";
    if (da !== db) return db.localeCompare(da);
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

/** API may return contact fields as arrays; coerce to a single trimmed string. */
function scalarTrim(val) {
  if (val === undefined || val === null) return "";
  if (Array.isArray(val)) {
    for (const item of val) {
      const s = String(item ?? "").trim();
      if (s) return s;
    }
    return "";
  }
  return String(val).trim();
}

function toStrArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val.map((x) => String(x ?? "").trim()).filter((s) => s !== "");
  const s = String(val).trim();
  return s ? [s] : [];
}

/** Comma-separated industry string → readable "A, B" spacing. */
function formatIndustryDisplay(val) {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  if (!s) return "";
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/** Zip parallel `primary_contact`, `designation`, `phone`, `email` arrays by index. */
function contactsFromParallelLead(lead) {
  if (!lead) return [];
  const names = toStrArray(lead.primary_contact);
  const desigs = toStrArray(lead.designation);
  const phones = toStrArray(lead.phone);
  const emails = toStrArray(lead.email);
  const n = Math.max(names.length, desigs.length, phones.length, emails.length);
  if (n === 0) return [];
  const rows = [];
  for (let i = 0; i < n; i++) {
    const name = names[i] ?? "";
    const designation = desigs[i] ?? "";
    const phone = phones[i] ?? "";
    const email = emails[i] ?? "";
    if (name || designation || phone || email) {
      rows.push({ name, designation, phone, email });
    }
  }
  return rows;
}

/** Build PUT body from overview edit form (snake_case for API). */
function buildPutBody(form) {
  const er = form.expected_revenue === "" ? null : Number(String(form.expected_revenue).replace(/[^0-9.]/g, ""));
  const ee = form.expected_expenses === "" ? null : Number(String(form.expected_expenses).replace(/[^0-9.]/g, ""));
  let gross_margin = null;
  let margin_percent = null;
  if (Number.isFinite(er) && Number.isFinite(ee)) {
    gross_margin = er - ee;
    margin_percent = er > 0 ? Number(((gross_margin / er) * 100).toFixed(1)) : 0;
  }
  return {
    brand: scalarTrim(form.brand),
    activity: scalarTrim(form.activity),
    stage: form.stage || "",
    current_status: form.current_status || form.stage || "",
    current_status_summary: scalarTrim(form.current_status_summary),
    primary_contact: scalarTrim(form.primary_contact),
    designation: scalarTrim(form.designation),
    phone: scalarTrim(form.phone),
    email: scalarTrim(form.email),
    city_region: scalarTrim(form.city_region),
    lead_source: scalarTrim(form.lead_source),
    priority: scalarTrim(form.priority),
    next_step: scalarTrim(form.next_step),
    next_follow_up_date: form.next_follow_up_date || null,
    expected_activity_date: form.expected_activity_date || null,
    expected_closure_date: form.expected_closure_date || null,
    expected_revenue: Number.isFinite(er) ? er : form.expected_revenue,
    expected_expenses: Number.isFinite(ee) ? ee : form.expected_expenses,
    ...(gross_margin !== null ? { gross_margin, margin_percent } : {}),
    dependencies: scalarTrim(form.dependencies),
    risk_blockers: scalarTrim(form.risk_blockers),
    proposal_link: scalarTrim(form.proposal_link),
  };
}

function emptyOverviewForm() {
  return {
    brand: "",
    activity: "",
    stage: "",
    current_status: "",
    current_status_summary: "",
    primary_contact: "",
    designation: "",
    phone: "",
    email: "",
    city_region: "",
    lead_source: "",
    priority: "",
    next_step: "",
    next_follow_up_date: "",
    expected_activity_date: "",
    expected_closure_date: "",
    expected_revenue: "",
    expected_expenses: "",
    dependencies: "",
    risk_blockers: "",
    proposal_link: "",
  };
}

/** Backend key is `expance_excel_links` (spelling per API). */
function pickExpenseExcelLink(row) {
  if (!row) return "";
  const v = row.expance_excel_links ?? row.expense_excel_links;
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/** API may expose expense lines under several keys; each item may include `payment`. */
function pickExpensesArray(row) {
  if (!row) return [];
  const raw =
    row.expenses ??
    row.expense_entries ??
    row.expense_list ??
    row.expence_list ??
    row.lead_expenses ??
    row.lead_expences;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object");
}

function sumExpensePayments(row, updatesSorted) {
  const arr = pickExpensesArray(row);
  if (arr.length > 0) {
    return arr.reduce((sum, item) => {
      const n = Number(item?.payment);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
  if (!Array.isArray(updatesSorted)) return 0;
  return updatesSorted.reduce((sum, item) => {
    const n = Number(item?.payment);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function leadToOverviewForm(lead) {
  if (!lead) return emptyOverviewForm();
  return {
    brand: lead.brand ?? "",
    activity: lead.activity ?? "",
    stage: lead.stage || lead.current_status || "",
    current_status: lead.current_status || lead.stage || "",
    current_status_summary: lead.current_status_summary ?? "",
    primary_contact: scalarTrim(lead.primary_contact),
    designation: scalarTrim(lead.designation),
    phone: scalarTrim(lead.phone),
    email: scalarTrim(lead.email),
    city_region: lead.city_region ?? "",
    lead_source: lead.lead_source ?? "",
    priority: lead.priority ?? "",
    next_step: lead.next_step ?? "",
    next_follow_up_date: sliceDate(lead.next_follow_up_date),
    expected_activity_date: sliceDate(lead.expected_activity_date),
    expected_closure_date: sliceDate(lead.expected_closure_date),
    expected_revenue: lead.expected_revenue ?? "",
    expected_expenses: lead.expected_expenses ?? "",
    dependencies: lead.dependencies ?? "",
    risk_blockers: lead.risk_blockers ?? lead.risks_blockers ?? "",
    proposal_link: lead.proposal_link ?? lead.attachments_links ?? "",
  };
}

function createEmptyFollowUpState({ updateDate, updateType }) {
  return {
    update_date: updateDate || new Date().toISOString().slice(0, 10),
    channel: "Call",
    update_type: updateType || "Follow-up",
    discussion_summary: "",
    client_sentiment: "Neutral",
    outcome: "Progressed",
    stage_after: "",
    value_after: "",
    expense_after: "",
    next_action: "",
    next_follow_up_date: "",
    next_follow_up_owner_id: "",
    expected_activity_date: "",
    expected_closure_date: "",
    risks_blockers: "",
    dependencies: "",
    links_attachments: "",
    internal_notes: "",
  };
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionOk, setActionOk] = useState(null);

  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseAmountInput, setExpenseAmountInput] = useState("");
  const [expensePaidForInput, setExpensePaidForInput] = useState("");
  const [expensePaidToInput, setExpensePaidToInput] = useState("");
  const [expenseDescriptionInput, setExpenseDescriptionInput] = useState("");
  const [expenseFile, setExpenseFile] = useState(null);
  const [savingExpenseEntry, setSavingExpenseEntry] = useState(false);

  const [overviewForm, setOverviewForm] = useState(emptyOverviewForm);

  const [followUp, setFollowUp] = useState(() =>
    createEmptyFollowUpState({
      updateDate: new Date().toISOString().slice(0, 10),
      updateType: "Follow-up",
    })
  );

  const loadLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      let raw = null;
      try {
        raw = await getApi("lead-tracking", { id });
      } catch {
        raw = null;
      }
      let row = parseLeadFromApi(raw, id);
      if (!row) {
        const listJson = await getApi("lead-tracking", { page: 1, limit: 200 });
        row = parseLeadFromApi(listJson, id);
      }
      if (!row) {
        throw new Error("Lead not found.");
      }
      setLead(row);
      setOverviewForm(leadToOverviewForm(row));
    } catch (e) {
      setError(e?.message || "Failed to load lead");
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const updates = useMemo(() => sortUpdates(lead?.lead_updates), [lead]);

  const latest = updates[0];
  const previousUpdate = updates[0] || null;
  const stageNow = (() => {
    const cs = String(lead?.current_status ?? "").trim();
    if (cs) return cs;
    const sa = previousUpdate?.stage_after;
    if (sa != null && String(sa).trim() !== "") return String(sa).trim();
    const st = String(lead?.stage ?? "").trim();
    if (st) return st;
    return "New";
  })();
  const valueNow = Number(previousUpdate?.value_after ?? lead?.expected_revenue ?? 0) || 0;
  const expenseNow = Number(previousUpdate?.expense_after ?? lead?.expected_expenses ?? 0) || 0;
  const sumLinePayments = useMemo(() => sumExpensePayments(lead, updates), [lead, updates]);
  const expenseColorClass = useMemo(
    () => getSpendVsBudgetColorClass(sumLinePayments, expenseNow),
    [sumLinePayments, expenseNow]
  );

  const expenseExcelLink = useMemo(() => pickExpenseExcelLink(lead), [lead]);

  const recordSummaryContacts = useMemo(() => contactsFromParallelLead(lead), [lead]);

  const openAddExpenseModal = () => {
    setExpenseAmountInput("");
    setExpensePaidForInput("");
    setExpensePaidToInput("");
    setExpenseDescriptionInput("");
    setExpenseFile(null);
    setActionError(null);
    setShowAddExpenseModal(true);
  };

  const saveExpenseEntry = async () => {
    if (!lead?.id) return;
    const parsedAmount = parseIndianRupeeInput(expenseAmountInput);
    if (parsedAmount === null || parsedAmount <= 0) {
      setActionError("Enter a valid expense amount.");
      return;
    }
    const paidFor = String(expensePaidForInput || "").trim();
    const paidTo = String(expensePaidToInput || "").trim();
    const description = String(expenseDescriptionInput || "").trim();
    if (!paidFor) {
      setActionError("Paid for is required.");
      return;
    }
    if (!paidTo) {
      setActionError("Paid to is required.");
      return;
    }
    if (!expenseFile) {
      setActionError("Upload a receipt or invoice file — we’ll save a OneDrive share link as proof automatically.");
      return;
    }

    setSavingExpenseEntry(true);
    setActionError(null);
    setActionOk(null);
    try {
      const form = new FormData();
      form.append("file", expenseFile);
      form.append("subfolder", "Invoices");
      form.append("leadName", lead.brand || lead.activity || `Lead-${lead.id}`);
      const uploadRes = await fetch(`/api/leads/${lead.id}/upload`, {
        method: "POST",
        body: form,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadData?.error || "File upload failed.");
      }

      const fromUpload =
        typeof uploadData?.fileWebUrl === "string" ? uploadData.fileWebUrl.trim() : "";
      if (!fromUpload) {
        throw new Error(
          "Could not get a link for the uploaded file. Check OneDrive / Graph permissions (createLink)."
        );
      }
      const expenceLink = fromUpload;

      const today = new Date().toISOString().slice(0, 10);
      const summaryParts = [
        `Expense added: ${formatMoney(parsedAmount)} for ${paidFor}.`,
        `Paid to ${paidTo}.`,
      ];
      if (description) summaryParts.push(description);
      const discussionSummary = summaryParts.join(" ");

      const patchBody = {
        lead_id: Number(lead.id),
        brand: lead.brand ?? "",
        update_date: today,
        channel: "In-person",
        update_type: "Expense",
        discussion_summary: discussionSummary,
        client_sentiment: "Neutral",
        outcome: "No change",
        stage_before: stageNow,
        stage_after: stageNow,
        value_before: valueNow,
        value_after: valueNow,
        expense_before: expenseNow,
        expense_after: expenseNow,
        next_action: lead?.next_step?.trim() || "",
        next_follow_up_date: sliceDate(lead?.next_follow_up_date) || null,
        next_follow_up_owner_id: null,
        expected_activity_date: sliceDate(lead?.expected_activity_date) || null,
        expected_closure_date: sliceDate(lead?.expected_closure_date) || null,
        risks_blockers: "",
        dependencies: "",
        links_attachments: expenceLink,
        internal_notes: "",
        payment: parsedAmount,
        paid_for: paidFor,
        paid_to: paidTo,
        description,
        expence_link: expenceLink,
      };

      await patchApi(`lead-tracking/${lead.id}`, patchBody);

      setShowAddExpenseModal(false);
      setActionOk(
        "Expense saved with OneDrive proof link, timeline updated, and file in the Invoices folder."
      );
      await loadLead();
    } catch (err) {
      setActionError(err?.message || String(err) || "Could not save expense entry.");
    } finally {
      setSavingExpenseEntry(false);
    }
  };

  const wonBanner = useMemo(() => {
    if (String(lead?.current_status ?? "").trim() !== "Won") return null;
    const wonUpdate = updates.find((u) => String(u.stage_after) === "Won");
    const closeRaw =
      wonUpdate?.update_date ||
      wonUpdate?.created_at ||
      lead?.updated_at ||
      lead?.updatedAt ||
      null;
    const closeDateStr = closeRaw ? sliceDate(closeRaw) : new Date().toISOString().slice(0, 10);
    return { closeDateStr };
  }, [updates, lead]);

  const openFollowUpModal = () => {
    setActionError(null);
    setActionOk(null);
    setFollowUp((prev) =>
      createEmptyFollowUpState({
        updateDate: new Date().toISOString().slice(0, 10),
        updateType: prev.update_type || "Follow-up",
      })
    );
    setShowFollowUp(true);
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    if (!lead?.id) return;
    if (!followUp.discussion_summary?.trim()) {
      setActionError("Please add a short discussion summary.");
      return;
    }
    setSavingFollowUp(true);
    setActionError(null);
    setActionOk(null);
    try {
      const ownerRaw = followUp.next_follow_up_owner_id?.toString().trim();
      const inputValueAfter = parseIndianRupeeInput(followUp.value_after);
      const inputExpenseAfter = parseIndianRupeeInput(followUp.expense_after);
      const patchBody = {
        lead_id: Number(lead.id),
        brand: lead.brand ?? "",
        update_date: followUp.update_date,
        channel: followUp.channel,
        update_type: followUp.update_type,
        discussion_summary: followUp.discussion_summary.trim(),
        client_sentiment: followUp.client_sentiment,
        outcome: followUp.outcome,
        stage_before: stageNow,
        stage_after: followUp.stage_after || stageNow,
        value_before: valueNow,
        value_after: inputValueAfter ?? valueNow,
        expense_before: expenseNow,
        expense_after: inputExpenseAfter ?? expenseNow,
        next_action: followUp.next_action?.trim() || "",
        next_follow_up_date: followUp.next_follow_up_date || null,
        next_follow_up_owner_id: ownerRaw ? Number(ownerRaw) : null,
        expected_activity_date: followUp.expected_activity_date || null,
        expected_closure_date: followUp.expected_closure_date || null,
        risks_blockers: followUp.risks_blockers?.trim() || "",
        dependencies: followUp.dependencies?.trim() || "",
        links_attachments: followUp.links_attachments?.trim() || "",
        internal_notes: followUp.internal_notes?.trim() || "",
      };
      await patchApi(`lead-tracking/${lead.id}`, patchBody);
      setActionOk("Follow-up saved. Timeline updated.");
      setShowFollowUp(false);
      await loadLead();
    } catch (err) {
      setActionError(err?.message || String(err) || "Could not save follow-up");
    } finally {
      setSavingFollowUp(false);
    }
  };

  const submitRecordEdit = async (e) => {
    e.preventDefault();
    if (!lead?.id) return;
    setSavingRecord(true);
    setActionError(null);
    setActionOk(null);
    try {
      await putApi(`lead-tracking/${lead.id}`, buildPutBody(overviewForm));
      if (overviewForm.activity?.trim()) {
        await fetch(`/api/leads/${lead.id}/sync-folder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rename",
            leadName: overviewForm.brand || overviewForm.activity,
            previousLeadName: lead.brand || lead.activity || "",
          }),
        });
      }
      setActionOk("Lead record updated.");
      setShowEditRecord(false);
      await loadLead();
    } catch (err) {
      setActionError(err?.message || String(err) || "Could not update lead");
    } finally {
      setSavingRecord(false);
    }
  };

  const openGuidedEdit = () => {
    const mapped = {
      ...lead,
      ...rowToInitialLead({
        ...lead,
        activityName: lead.activity,
        currentStatus: lead.current_status || lead.stage,
      }),
    };
    useLeadFormStore.getState().openLeadForm(mapped);
    router.push("/leads/new");
  };

  const openLeadFolders = async () => {
    if (!lead?.id) return;
    try {
      const leadName = encodeURIComponent(lead.brand || lead.activity || `Lead-${lead.id}`);
      const res = await fetch(`/api/leads/${lead.id}/folder-link?leadName=${leadName}`);
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Could not open OneDrive folder.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err?.message || "Could not open OneDrive folder.");
    }
  };

  const handleUploadFolderClick = () => {
    // Placeholder for upcoming folder-upload flow.
  };

  if (loading) {
    return (
      <main className="w-full space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (error || !lead) {
    return (
      <main className="w-full">
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to leads
        </Link>
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          {error || "Lead not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full space-y-8 pb-16">
      {wonBanner && (
        <section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 px-5 py-6 text-white shadow-lg shadow-emerald-900/25 sm:rounded-3xl sm:px-8 sm:py-7"
          aria-label="Lead won"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10 sm:h-48 sm:w-48"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/35 ring-1 ring-white/20 sm:h-16 sm:w-16"
                aria-hidden
              >
                <span className="text-3xl sm:text-4xl">🏆</span>
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Lead Won!</h2>
                <p className="mt-1.5 text-sm text-emerald-50/95 sm:text-base">
                  Deal closed successfully on {wonBanner.closeDateStr}
                </p>
              </div>
            </div>
            <div className="text-center sm:text-left lg:shrink-0">
              <p className="text-xl font-bold tabular-nums sm:text-2xl">{formatMoney(valueNow)}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/90 sm:text-[11px]">
                Final deal value
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/40 px-6 py-7 shadow-sm sm:px-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-indigo-300/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-2xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-slate-50 hover:text-indigo-700"
          >
            ← All leads
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl xl:text-5xl">
              {lead.brand || "Lead"}{" "}
              <span className="font-semibold text-slate-400">·</span>{" "}
              <span className="text-slate-700">{lead.activity || "—"}</span>
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ${pillClass(stageNow)}`}
            >
              {stageNow}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
            See the latest progress at a glance, add new meeting notes, and keep lead details up to date from one clear view.
          </p>
        </div>
        <div className="inline-flex w-full flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-sm sm:flex-row sm:items-center lg:w-auto">
          <button
            type="button"
            onClick={openLeadFolders}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm"
          >
            <span className="text-base leading-none" aria-hidden="true">📁</span>
            Open lead folders
          </button>
          <button
            type="button"
            onClick={openFollowUpModal}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 sm:text-sm"
          >
            Follow-up note
          </button>
          <button
            type="button"
            onClick={() => {
              setOverviewForm(leadToOverviewForm(lead));
              setActionError(null);
              setShowEditRecord(true);
            }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm"
          >
            Update details
          </button>
          <button
            type="button"
            onClick={openGuidedEdit}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm"
          >
            Advanced edit
          </button>
        </div>
      </div>
      </div>

      {(actionOk || actionError) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionOk
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {actionOk || actionError}
        </div>
      )}

      {/* Snapshot cards */}
      <section className="grid gap-5 xl:grid-cols-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:p-7 xl:col-span-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Commercial</p>
          <p className="mt-3 text-3xl font-bold tabular-nums">{formatMoney(valueNow)}</p>
          <p className="mt-1 text-sm text-white/75">Expected revenue</p>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-y-1.5">
                <p className="flex min-h-4.5 items-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Expense forecast
                </p>
                <p className="text-xl font-bold tabular-nums tracking-tight text-white sm:text-2xl">{formatMoney(expenseNow)}</p>
                <span className="invisible text-[10px] font-medium leading-snug" aria-hidden>
                  Open ledger →
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/leads/${lead.id}/expenses`)}
                className={`group flex shrink-0 flex-col items-end gap-y-1.5 rounded-lg px-2 py-1 text-right transition hover:bg-white/5 ${expenseColorClass}`}
              >
                <span className="flex min-h-4.5 items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 group-hover:text-white/55">
                  <svg className="h-3.5 w-3.5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Verified spend
                </span>
                <span className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl">{formatMoney(sumLinePayments)}</span>
                <span className="text-[10px] font-medium leading-snug text-white/40 underline-offset-2 group-hover:underline">Open ledger →</span>
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            {expenseExcelLink ? (
              <a
                href={
                  /^https?:\/\//i.test(expenseExcelLink)
                    ? expenseExcelLink
                    : `https://${expenseExcelLink.replace(/^\/+/, "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                title={expenseExcelLink}
                aria-label={`Open all expenses (${expenseExcelLink})`}
                className="inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-semibold text-emerald-200/95 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/50"
              >
                <svg className="h-4 w-4 shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Expense workbook
              </a>
            ) : (
              <p className="text-xs text-white/45">No workbook link on file.</p>
            )}
            <button
              type="button"
              onClick={openAddExpenseModal}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-900 shadow-md shadow-black/10 transition hover:bg-slate-100"
            >
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add expense
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-7 xl:col-span-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Next steps</p>
          <p className="mt-3 text-base font-semibold text-slate-900">
            {latest?.next_action || lead.next_step || "—"}
          </p>
          <p className="mt-3 text-sm text-slate-500">Next contact</p>
          <p className="text-sm font-medium text-slate-800 sm:text-base">{sliceDate(lead.next_follow_up_date) || "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-7 xl:col-span-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dates</p>
          <p className="mt-3 text-sm text-slate-500">Activity</p>
          <p className="text-sm font-medium text-slate-900 sm:text-base">{sliceDate(lead.expected_activity_date) || "—"}</p>
          <p className="mt-3 text-sm text-slate-500">Closure target</p>
          <p className="text-sm font-medium text-slate-900 sm:text-base">{sliceDate(lead.expected_closure_date) || "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-7 xl:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Last touch</p>
          {latest ? (
            <>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sentimentClass(latest.client_sentiment)}`}>
                  {latest.client_sentiment || "—"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {latest.outcome || "—"}
                </span>
              </div>
              <p className="mt-3 max-h-24 overflow-auto whitespace-pre-line break-words text-sm text-slate-700 sm:text-base">
                {textWithBreaks(latest.discussion_summary)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500 sm:text-base">No updates added yet.</p>
          )}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-12">
        {/* Timeline */}
        <section className="xl:col-span-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Activity timeline</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">Newest updates first. Each entry captures what changed and what comes next.</p>
          <div className="mt-5 space-y-4">
            {updates.length === 0 ? (
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/70 p-8 text-center text-sm text-slate-600 sm:text-base">
                No entries yet. Use <strong className="text-slate-700">Follow-up note</strong> after a call or meeting.
              </div>
            ) : (
              updates.map((u, idx) => {
                const olderEntry = updates[idx + 1] || null;
                const displayValueBefore = Number(
                  olderEntry?.value_after ?? u.value_before ?? 0
                );
                const displayValueAfter = Number(u.value_after ?? u.value_before ?? 0);
                const displayExpenseBefore = Number(
                  olderEntry?.expense_after ?? u.expense_before ?? 0
                );
                const displayExpenseAfter = Number(u.expense_after ?? u.expense_before ?? 0);
                return (
                <article
                  key={u.id ?? `${u.update_date}-${u.created_by_id}`}
                  className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-violet-400" />
                  <div className="pl-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <time className="text-sm font-bold text-slate-900">{sliceDate(u.update_date) || "—"}</time>
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                          {u.update_type || "Update"}
                        </span>
                        <span className="text-[11px] text-slate-500">{u.channel || ""}</span>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{u.username || u.full_name || `User ${u.created_by_id ?? ""}`}</span>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-800 sm:text-base">
                      {textWithBreaks(u.discussion_summary)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {u.stage_before !== u.stage_after && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-800">
                          Stage: {u.stage_before || "—"} <span className="text-indigo-600">→</span> {u.stage_after || "—"}
                        </span>
                      )}
                      {Number(u.payment) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-900">
                          Expense recorded: {formatMoney(u.payment)}
                          {u.paid_for ? <span className="font-medium text-rose-800"> — {u.paid_for}</span> : null}
                          {u.paid_to ? <span className="text-rose-700"> · To {u.paid_to}</span> : null}
                        </span>
                      )}
                      {(displayValueBefore !== displayValueAfter || displayExpenseBefore !== displayExpenseAfter) && (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                            Revenue: {formatMoney(displayValueBefore)} → {formatMoney(displayValueAfter)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                            Expense: {formatMoney(displayExpenseBefore)} → {formatMoney(displayExpenseAfter)}
                          </span>
                        </>
                      )}
                    </div>
                    {(u.risk_blockers ||
                      u.dependencies ||
                      u.attachments_links ||
                      u.links_attachments ||
                      u.expence_link) && (
                      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                        {u.risk_blockers ? <p><span className="font-semibold text-slate-700">Risks:</span> {u.risk_blockers}</p> : null}
                        {u.dependencies ? <p><span className="font-semibold text-slate-700">Dependencies:</span> {u.dependencies}</p> : null}
                        {(u.attachments_links || u.links_attachments) ? (
                          <p className="truncate">
                            <span className="font-semibold text-slate-700">Links:</span>{" "}
                            <a href={String(u.attachments_links || u.links_attachments)} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                              {u.attachments_links || u.links_attachments}
                            </a>
                          </p>
                        ) : null}
                        {u.expence_link ? (
                          <p>
                            <span className="font-semibold text-slate-700">Expense sheet:</span>{" "}
                            <a
                              href={
                                /^https?:\/\//i.test(String(u.expence_link))
                                  ? String(u.expence_link)
                                  : `https://${String(u.expence_link).replace(/^\/+/, "")}`
                              }
                              className="font-semibold text-indigo-600 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open file
                            </a>
                          </p>
                        ) : null}
                      </div>
                    )}
                    {u.description || u.expense_description ? (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Expense notes:</span> {u.description || u.expense_description}
                      </p>
                    ) : null}
                    {u.internal_notes ? (
                      <p className="mt-2 rounded-lg bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950">
                        <span className="font-bold">Internal:</span> {u.internal_notes}
                      </p>
                    ) : null}
                  </div>
                </article>
                );
              })
            )}
          </div>
        </section>

        {/* Side: context */}
        <aside className="space-y-5 xl:col-span-4">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/50 p-6 shadow-sm sm:p-7">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Lead folder</h3>
            <p className="mt-2 text-sm text-slate-600">
              Upload directly into OneDrive subfolders for this lead.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleUploadFolderClick}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Upload Folder
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/65 via-white to-indigo-50/55 p-6 shadow-sm sm:p-7">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Record summary</h3>
            <dl className="mt-4 space-y-3 text-sm sm:text-base">
              <div>
                <dt className="text-xs text-slate-500">Region</dt>
                <dd className="font-medium text-slate-900">{lead.city_region || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Source</dt>
                <dd className="font-medium text-slate-900">{lead.lead_source || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Priority</dt>
                <dd className="font-medium text-slate-900">{lead.priority || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Contacts</dt>
                <dd className="mt-1 space-y-3">
                  {recordSummaryContacts.length === 0 ? (
                    <span className="font-medium text-slate-900">—</span>
                  ) : (
                    recordSummaryContacts.map((c, idx) => (
                      <div
                        key={`${c.name}-${c.phone}-${idx}`}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <p className="font-semibold text-slate-900">{c.name || "—"}</p>
                        {c.designation ? (
                          <p className="mt-0.5 text-xs font-medium text-slate-500">{c.designation}</p>
                        ) : null}
                        {c.phone ? (
                          <p className="mt-1.5 text-sm text-slate-700">
                            <a
                              href={`tel:${String(c.phone).replace(/\s/g, "")}`}
                              className="text-indigo-700 hover:underline"
                            >
                              {c.phone}
                            </a>
                          </p>
                        ) : null}
                        {c.email ? (
                          <p className="mt-0.5 text-sm">
                            <a
                              href={`mailto:${c.email}`}
                              className="text-indigo-700 hover:underline wrap-break-word"
                            >
                              {c.email}
                            </a>
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/75 via-white to-fuchsia-50/60 p-6 sm:p-7">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Current story</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Industry</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-slate-700 sm:text-base">
                  {formatIndustryDisplay(lead.industry) || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status summary</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 sm:text-base">
                  {textWithBreaks(lead.current_status_summary || latest?.discussion_summary || "No summary yet.")}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Follow-up modal */}
      {showFollowUp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="followup-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <h2 id="followup-title" className="text-xl font-bold text-slate-900">
                  Follow-up note
                </h2>
                <p className="text-sm text-slate-500">Capture the latest conversation and what should happen next.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFollowUp(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitFollowUp} className="space-y-5 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Update date</span>
                  <input
                    type="date"
                    required
                    value={followUp.update_date}
                    onChange={(e) => setFollowUp((p) => ({ ...p, update_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Channel</span>
                  <select
                    value={followUp.channel}
                    onChange={(e) => setFollowUp((p) => ({ ...p, channel: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Update type</span>
                  <select
                    value={followUp.update_type}
                    onChange={(e) => setFollowUp((p) => ({ ...p, update_type: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {UPDATE_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Client sentiment</span>
                  <select
                    value={followUp.client_sentiment}
                    onChange={(e) => setFollowUp((p) => ({ ...p, client_sentiment: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {SENTIMENT_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Discussion summary *</span>
                <textarea
                  required
                  rows={3}
                  value={followUp.discussion_summary}
                  onChange={(e) => setFollowUp((p) => ({ ...p, discussion_summary: e.target.value }))}
                  placeholder="What was discussed? Decisions, open questions…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Outcome</span>
                <select
                  value={followUp.outcome}
                  onChange={(e) => setFollowUp((p) => ({ ...p, outcome: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {OUTCOME_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">After this touch</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-slate-600">Stage (after)</span>
                    <select
                      value={followUp.stage_after}
                      onChange={(e) => setFollowUp((p) => ({ ...p, stage_after: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">Expected revenue (after)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={followUp.value_after}
                      onChange={(e) => setFollowUp((p) => ({ ...p, value_after: e.target.value }))}
                      onBlur={() =>
                        setFollowUp((p) => {
                          const parsed = parseIndianRupeeInput(p.value_after);
                          if (parsed === null) return p;
                          return { ...p, value_after: String(parsed) };
                        })
                      }
                      placeholder="E.g. 1000000, 10l, 1 cr"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">Expected expenses (after)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={followUp.expense_after}
                      onChange={(e) => setFollowUp((p) => ({ ...p, expense_after: e.target.value }))}
                      onBlur={() =>
                        setFollowUp((p) => {
                          const parsed = parseIndianRupeeInput(p.expense_after);
                          if (parsed === null) return p;
                          return { ...p, expense_after: String(parsed) };
                        })
                      }
                      placeholder="E.g. 900000, 9l, 50k"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 sm:col-span-2">
                    You can use shorthand (spaces optional): <span className="font-medium text-slate-600">10l</span>,{" "}
                    <span className="font-medium text-slate-600">1 cr</span>,{" "}
                    <span className="font-medium text-slate-600">50k</span>. Values convert to rupees on blur.
                  </p>
                  <p className="text-[11px] text-slate-500 sm:col-span-2">
                    Before: stage <strong>{stageNow}</strong>, revenue <strong>{formatMoney(valueNow)}</strong>, expenses{" "}
                    <strong>{formatMoney(expenseNow)}</strong>
                  </p>
                </div>
              </div>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Next action</span>
                <input
                  type="text"
                  value={followUp.next_action}
                  onChange={(e) => setFollowUp((p) => ({ ...p, next_action: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Next contact date</span>
                  <input
                    type="date"
                    value={followUp.next_follow_up_date}
                    onChange={(e) => setFollowUp((p) => ({ ...p, next_follow_up_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Next contact owner (optional)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter owner id"
                    value={followUp.next_follow_up_owner_id}
                    onChange={(e) => setFollowUp((p) => ({ ...p, next_follow_up_owner_id: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Use this only when you want to assign who will handle the next contact (enter team member user ID).
                  </p>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Expected activity date</span>
                  <input
                    type="date"
                    value={followUp.expected_activity_date}
                    onChange={(e) => setFollowUp((p) => ({ ...p, expected_activity_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Expected closure date</span>
                  <input
                    type="date"
                    value={followUp.expected_closure_date}
                    onChange={(e) => setFollowUp((p) => ({ ...p, expected_closure_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Risks / blockers</span>
                <textarea
                  rows={2}
                  value={followUp.risks_blockers}
                  onChange={(e) => setFollowUp((p) => ({ ...p, risks_blockers: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Dependencies</span>
                <textarea
                  rows={2}
                  value={followUp.dependencies}
                  onChange={(e) => setFollowUp((p) => ({ ...p, dependencies: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Links / attachments</span>
                <input
                  type="url"
                  value={followUp.links_attachments}
                  onChange={(e) => setFollowUp((p) => ({ ...p, links_attachments: e.target.value }))}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Internal notes</span>
                <textarea
                  rows={2}
                  value={followUp.internal_notes}
                  onChange={(e) => setFollowUp((p) => ({ ...p, internal_notes: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFollowUp(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFollowUp}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingFollowUp ? "Saving…" : "Save update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit record modal */}
      {showEditRecord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <h2 id="edit-title" className="text-xl font-bold text-slate-900">
                  Update lead details
                </h2>
                <p className="text-sm text-slate-500">Edit key fields like stage, value, timeline, and notes.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditRecord(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitRecordEdit} className="space-y-4 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Brand</span>
                  <input
                    type="text"
                    value={overviewForm.brand}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, brand: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Activity / campaign</span>
                  <input
                    type="text"
                    value={overviewForm.activity}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, activity: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Stage</span>
                  <select
                    value={overviewForm.stage}
                    onChange={(e) =>
                      setOverviewForm((p) => ({
                        ...p,
                        stage: e.target.value,
                        current_status: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Priority</span>
                  <input
                    type="text"
                    value={overviewForm.priority}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, priority: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Status summary</span>
                  <textarea
                    rows={3}
                    value={overviewForm.current_status_summary}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, current_status_summary: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Primary contact</span>
                  <input
                    type="text"
                    value={overviewForm.primary_contact}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, primary_contact: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Designation</span>
                  <input
                    type="text"
                    value={overviewForm.designation}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, designation: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Phone</span>
                  <input
                    type="text"
                    value={overviewForm.phone}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={overviewForm.email}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">City / region</span>
                  <input
                    type="text"
                    value={overviewForm.city_region}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, city_region: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Lead source</span>
                  <input
                    type="text"
                    value={overviewForm.lead_source}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, lead_source: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Expected revenue</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={overviewForm.expected_revenue}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, expected_revenue: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Expected expenses</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={overviewForm.expected_expenses}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, expected_expenses: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Next follow-up date</span>
                  <input
                    type="date"
                    value={overviewForm.next_follow_up_date}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, next_follow_up_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Next step</span>
                  <input
                    type="text"
                    value={overviewForm.next_step}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, next_step: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Expected activity date</span>
                  <input
                    type="date"
                    value={overviewForm.expected_activity_date}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, expected_activity_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Expected closure date</span>
                  <input
                    type="date"
                    value={overviewForm.expected_closure_date}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, expected_closure_date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Dependencies</span>
                  <textarea
                    rows={2}
                    value={overviewForm.dependencies}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, dependencies: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Risks / blockers</span>
                  <textarea
                    rows={2}
                    value={overviewForm.risk_blockers}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, risk_blockers: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Proposal / doc link</span>
                  <input
                    type="url"
                    value={overviewForm.proposal_link}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, proposal_link: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditRecord(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingRecord ? "Saving…" : "Save record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-[2px] sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-expense-title"
            className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
          >
            <div className="relative bg-gradient-to-br from-[#0f1f45] via-[#1a2f63] to-[#6a63dc] px-6 pb-8 pt-6 text-white">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">New entry</p>
              <h2 id="add-expense-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                Add Expense
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
                Saved like a follow-up update. Optional file lands in the lead&apos;s{" "}
                <span className="font-semibold text-white/90">Invoices</span> folder in OneDrive.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold text-slate-800">Amount</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expenseAmountInput}
                    onChange={(e) => setExpenseAmountInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseIndianRupeeInput(expenseAmountInput);
                      if (parsed !== null) setExpenseAmountInput(String(parsed));
                    }}
                    placeholder="e.g. 12000, 1.2L, 50K"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/15"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold text-slate-800">Receipt or invoice (required)</span>
                  <input
                    type="file"
                    onChange={(e) => setExpenseFile(e.target.files?.[0] || null)}
                    className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white file:shadow-sm hover:file:bg-slate-800"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-800">Paid for</span>
                  <input
                    type="text"
                    value={expensePaidForInput}
                    onChange={(e) => setExpensePaidForInput(e.target.value)}
                    placeholder="Category or purpose"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-800">Paid to</span>
                  <input
                    type="text"
                    value={expensePaidToInput}
                    onChange={(e) => setExpensePaidToInput(e.target.value)}
                    placeholder="Vendor or payee"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold text-slate-800">Notes</span>
                  <textarea
                    rows={2}
                    value={expenseDescriptionInput}
                    onChange={(e) => setExpenseDescriptionInput(e.target.value)}
                    placeholder="Optional context for finance or leadership"
                    className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingExpenseEntry}
                onClick={saveExpenseEntry}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingExpenseEntry ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
