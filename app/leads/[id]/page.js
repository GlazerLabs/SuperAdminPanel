"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getApi, patchApi, putApi } from "@/api";
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

const UPDATE_TYPES = ["Follow-up", "Meeting", "Proposal", "Negotiation", "Closure", "Other"];

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

const LEAD_FOLDERS_URL =
  process.env.NEXT_PUBLIC_LEAD_FOLDERS_URL ||
  "https://glazergamesprivatelimited-my.sharepoint.com/my?id=%2Fpersonal%2Fkalpesh%5Fmahale%5Fglazer%5Fgames%2FDocuments%2FLead%20Folders&viewid=b4bed52c%2Dc1ee%2D4b86%2Db094%2D6987fb514d1a";

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
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  return `₹${num.toLocaleString("en-IN")}`;
}

function textWithBreaks(v) {
  if (v === undefined || v === null) return "—";
  const cleaned = String(v).replace(/\\n/g, "\n").trim();
  return cleaned || "—";
}

function parseNumericInput(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
    brand: form.brand?.trim() || "",
    activity: form.activity?.trim() || "",
    stage: form.stage || "",
    current_status: form.current_status || form.stage || "",
    current_status_summary: form.current_status_summary?.trim() || "",
    primary_contact: form.primary_contact?.trim() || "",
    designation: form.designation?.trim() || "",
    phone: form.phone?.trim() || "",
    email: form.email?.trim() || "",
    city_region: form.city_region?.trim() || "",
    lead_source: form.lead_source?.trim() || "",
    priority: form.priority?.trim() || "",
    next_step: form.next_step?.trim() || "",
    next_follow_up_date: form.next_follow_up_date || null,
    expected_activity_date: form.expected_activity_date || null,
    expected_closure_date: form.expected_closure_date || null,
    expected_revenue: Number.isFinite(er) ? er : form.expected_revenue,
    expected_expenses: Number.isFinite(ee) ? ee : form.expected_expenses,
    ...(gross_margin !== null ? { gross_margin, margin_percent } : {}),
    dependencies: form.dependencies?.trim() || "",
    risk_blockers: form.risk_blockers?.trim() || "",
    proposal_link: form.proposal_link?.trim() || "",
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

function leadToOverviewForm(lead) {
  if (!lead) return emptyOverviewForm();
  return {
    brand: lead.brand ?? "",
    activity: lead.activity ?? "",
    stage: lead.stage || lead.current_status || "",
    current_status: lead.current_status || lead.stage || "",
    current_status_summary: lead.current_status_summary ?? "",
    primary_contact: lead.primary_contact ?? "",
    designation: lead.designation ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
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

  const [overviewForm, setOverviewForm] = useState(emptyOverviewForm);

  const [followUp, setFollowUp] = useState({
    update_date: new Date().toISOString().slice(0, 10),
    channel: "Call",
    update_type: "Follow-up",
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
  });

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
  const stageNow = previousUpdate?.stage_after || lead?.stage || lead?.current_status || "New";
  const valueNow = Number(previousUpdate?.value_after ?? lead?.expected_revenue ?? 0) || 0;
  const expenseNow = Number(previousUpdate?.expense_after ?? lead?.expected_expenses ?? 0) || 0;

  const openFollowUpModal = () => {
    setActionError(null);
    setActionOk(null);
    setFollowUp((prev) => ({
      ...prev,
      update_date: new Date().toISOString().slice(0, 10),
      stage_after: stageNow,
      value_after: String(valueNow || ""),
      expense_after: String(expenseNow || ""),
      next_follow_up_date: sliceDate(lead?.next_follow_up_date) || "",
      expected_activity_date: sliceDate(lead?.expected_activity_date) || "",
      expected_closure_date: sliceDate(lead?.expected_closure_date) || "",
      risks_blockers: lead?.risk_blockers || latest?.risk_blockers || "",
      dependencies: lead?.dependencies || latest?.dependencies || "",
      links_attachments: latest?.attachments_links || latest?.links_attachments || lead?.proposal_link || "",
    }));
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
      const inputValueAfter = parseNumericInput(followUp.value_after);
      const inputExpenseAfter = parseNumericInput(followUp.expense_after);
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

  const openLeadFolders = () => {
    window.open(LEAD_FOLDERS_URL, "_blank", "noopener,noreferrer");
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
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/40 px-6 py-7 shadow-sm sm:px-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-indigo-300/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-2xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
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
          <p className="mt-4 text-xl font-semibold tabular-nums text-white/90">{formatMoney(expenseNow)}</p>
          <p className="text-sm text-white/65">Expenses</p>
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
                      {(displayValueBefore !== displayValueAfter || displayExpenseBefore !== displayExpenseAfter) && (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                            Revenue: ₹{displayValueBefore.toLocaleString("en-IN")} → ₹{displayValueAfter.toLocaleString("en-IN")}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                            Expense: ₹{displayExpenseBefore.toLocaleString("en-IN")} → ₹{displayExpenseAfter.toLocaleString("en-IN")}
                          </span>
                        </>
                      )}
                    </div>
                    {(u.risk_blockers || u.dependencies || u.attachments_links || u.links_attachments) && (
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
                      </div>
                    )}
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
                <dt className="text-xs text-slate-500">Contact</dt>
                <dd className="font-medium text-slate-900">
                  {lead.primary_contact || "—"}
                  <br />
                  <span className="text-slate-600">{lead.phone || lead.email || ""}</span>
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/75 via-white to-fuchsia-50/60 p-6 sm:p-7">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Current story</h3>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 sm:text-base">
              {textWithBreaks(lead.current_status_summary || latest?.discussion_summary || "No summary yet.")}
            </p>
            {lead.risk_blockers || lead.dependencies ? (
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-xs">
                {lead.risk_blockers ? (
                  <p>
                    <span className="font-semibold text-rose-800">Risks / blockers</span>
                    <br />
                    {lead.risk_blockers}
                  </p>
                ) : null}
                {lead.dependencies ? (
                  <p>
                    <span className="font-semibold text-slate-800">Dependencies</span>
                    <br />
                    {lead.dependencies}
                  </p>
                ) : null}
              </div>
            ) : null}
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
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
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
    </main>
  );
}
