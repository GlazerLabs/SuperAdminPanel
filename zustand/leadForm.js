"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** First non-empty scalar among API / UI variants (camelCase + snake_case). */
function pickText(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
    const s = typeof v === "string" ? v.trim() : String(v).trim();
    if (s !== "") return typeof v === "string" ? v.trim() : s;
  }
  return "";
}

function sliceDateIso(v) {
  const t = pickText(v);
  return t ? t.slice(0, 10) : "";
}

function normalizeDeliverableTypes(row) {
  const raw = row.deliverableTypes ?? row.deliverable_types ?? row.industry;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter(Boolean) : [];
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

const KNOWN_DELIVERABLE_TYPES = new Set([
  "Tournament / League",
  "One-off Event",
  "Influencer Campaign",
  "Branding / Integration",
  "Content Production",
  "Community Activation",
  "Other",
]);

function normalizeDeliverablesForForm(row) {
  const all = normalizeDeliverableTypes(row);
  const known = all.filter((item) => KNOWN_DELIVERABLE_TYPES.has(item));
  const custom = all.filter((item) => item && !KNOWN_DELIVERABLE_TYPES.has(item));

  if (custom.length && !known.includes("Other")) {
    known.push("Other");
  }

  return {
    deliverableTypes: known,
    otherDeliverables: custom.length ? custom : [""],
  };
}

const PAYMENT_TERMS_OPTIONS = new Set([
  "Advance",
  "Milestones",
  "Post-completion",
  "NET 15",
  "NET 30",
  "Custom",
]);

function normalizePaymentTermsForForm(row) {
  const raw = pickText(row.paymentTerms, row.payment_terms);
  if (!raw) {
    return { paymentTerms: "", paymentTermsCustom: "" };
  }
  if (PAYMENT_TERMS_OPTIONS.has(raw)) {
    return {
      paymentTerms: raw,
      paymentTermsCustom: raw === "Custom" ? pickText(row.paymentTermsCustom, row.payment_terms_custom) : "",
    };
  }
  return { paymentTerms: "Custom", paymentTermsCustom: raw };
}

function normalizeContacts(row) {
  const raw = row.contacts ?? row.contacts_stakeholders ?? row.stakeholders;
  const fromArray = Array.isArray(raw)
    ? raw
        .map((item) => ({
          name: pickText(item?.name, item?.primary_contact, item?.full_name),
          phone: pickText(item?.phone),
          email: pickText(item?.email),
          role: pickText(item?.role, item?.designation),
        }))
        .filter((c) => c.name || c.phone || c.email || c.role)
    : [];

  if (fromArray.length) return fromArray;

  const names = Array.isArray(row.primary_contact) ? row.primary_contact : [];
  const phones = Array.isArray(row.phone) ? row.phone : [];
  const emails = Array.isArray(row.email) ? row.email : [];
  const roles = Array.isArray(row.designation) ? row.designation : [];
  const maxLen = Math.max(names.length, phones.length, emails.length, roles.length);
  if (maxLen > 0) {
    const fromParallelArrays = Array.from({ length: maxLen }, (_, index) => ({
      name: pickText(names[index]),
      phone: pickText(phones[index]),
      email: pickText(emails[index]),
      role: pickText(roles[index]),
    })).filter((c) => c.name || c.phone || c.email || c.role);
    if (fromParallelArrays.length) return fromParallelArrays;
  }

  const fallback = {
    name: pickText(row.primaryContactName, row.primary_contact),
    phone: pickText(row.phone),
    email: pickText(row.email),
    role: pickText(row.role, row.designation),
  };
  if (fallback.name || fallback.phone || fallback.email || fallback.role) return [fallback];
  return [{ name: "", phone: "", email: "", role: "" }];
}

/**
 * Maps a table row (from leads list) and/or raw API records to the same shape as the add form (INITIAL_LEAD)
 * so /leads/new can reuse the exact same form for edit.
 */
export function rowToInitialLead(row) {
  if (!row) return null;
  const deliverables = normalizeDeliverablesForForm(row);
  const paymentTermsState = normalizePaymentTermsForForm(row);
  return {
    brand: pickText(row.brand),
    activityName: pickText(row.activityName, row.activity),
    leadOwner: pickText(row.leadOwner, row.lead_owner, row.full_name, row.username),
    currentStatus: pickText(row.currentStatus, row.current_status, row.stage) || "New",
    nextFollowUpDate: sliceDateIso(pickText(row.nextFollowUpDate, row.next_follow_up_date)),
    nextStep: pickText(row.nextStep, row.next_step),
    primaryChannel: pickText(row.primaryChannel, row.primary_channel, row.channel),
    leadSource: pickText(row.leadSource, row.lead_source),
    cityRegion: pickText(row.cityRegion, row.city_region),
    mode: pickText(row.mode),
    activityType: pickText(row.activityType, row.activity_type),
    priority: pickText(row.priority),
    tags: pickText(row.tags),
    primaryContactName: pickText(row.primaryContactName, row.primary_contact),
    phone: pickText(row.phone),
    email: pickText(row.email),
    role: pickText(row.role, row.designation),
    decisionMakerKnown: pickText(row.decisionMakerKnown, row.decision_maker_known) || "No",
    decisionMakerName: pickText(row.decisionMakerName, row.decision_maker),
    decisionMakerRole: pickText(row.decisionMakerRole, row.decision_maker_role),
    procurementContact: pickText(row.procurementContact, row.procurement_contact),
    agencyInvolved: pickText(row.agencyInvolved, row.agency_involved),
    preferredContactTime: pickText(row.preferredContactTime, row.preferred_contact_time),
    objective: pickText(row.objective, row.current_status_summary),
    deliverableTypes: deliverables.deliverableTypes,
    otherDeliverables: deliverables.otherDeliverables,
    activityDate: sliceDateIso(pickText(row.activityDate, row.expected_activity_date)),
    activityWindowFrom: sliceDateIso(pickText(row.activityWindowFrom, row.execution_window_from)),
    activityWindowTo: sliceDateIso(pickText(row.activityWindowTo, row.execution_window_to)),
    geographyScope: pickText(row.geographyScope, row.geography_scope, row.scope_summary),
    participantsEstimate: pickText(row.participantsEstimate, row.participants_estimate),
    gameTitles: pickText(row.gameTitles, row.game_titles),
    integrations: pickText(row.integrations),
    successMetrics: pickText(row.successMetrics, row.success_metrics),
    dependencies: pickText(row.dependencies),
    riskBlockers: pickText(row.riskBlockers, row.risk_blockers),
    expectedClosureDate: sliceDateIso(pickText(row.expectedClosureDate, row.expected_closure_date)),
    probability: pickText(row.probability),
    proposalSharedDate: sliceDateIso(
      pickText(row.proposalSharedDate, row.proposal_shared_date, row.proporsal_shared_date)
    ),
    expectedRevenueType: pickText(row.expectedRevenueType) || "value",
    expectedRevenueValue: pickText(row.expectedRevenueValue, row.expected_revenue),
    expectedRevenueRange: pickText(row.expectedRevenueRange, row.expected_revenue_range),
    expectedRevenueNote: pickText(row.expectedRevenueNote, row.expected_revenue_note),
    expenseModel: pickText(row.expenseModel, row.expense_model),
    paymentTerms: paymentTermsState.paymentTerms,
    paymentTermsCustom: paymentTermsState.paymentTermsCustom,
    gstApplicable: pickText(row.gstApplicable, row.gst_applicable) || "Yes",
    expectedExpenses: pickText(row.expectedExpenses, row.expected_expenses),
    revenueModel: pickText(row.revenueModel, row.revenue_model),
    invoiceEntity: pickText(row.invoiceEntity, row.invoice_entity),
    discountTerms: pickText(row.discountTerms, row.discount_terms),
    proposalLink: pickText(row.proposalLink, row.proposal_link),
    sowStatus: pickText(row.sowStatus, row.sow_status),
    poStatus: pickText(row.poStatus, row.po_status),
    proposalDueDate: sliceDateIso(pickText(row.proposalDueDate, row.proposal_due_date)),
    contacts: normalizeContacts(row),
  };
}

export const useLeadFormStore = create(
  persist(
    (set) => ({
      selectedLead: null,
      leadFlowState: null,

      openLeadForm: (lead) => set({ selectedLead: lead }),

      closeLeadForm: () => set({ selectedLead: null }),

      setLeadFlowState: (payload) =>
        set((state) => ({
          leadFlowState: {
            ...(state.leadFlowState || {}),
            ...payload,
          },
        })),

      clearLeadFlowState: () => set({ leadFlowState: null }),
    }),
    {
      name: "lead-form-storage",
      partialize: (state) => ({
        selectedLead: state.selectedLead,
        leadFlowState: state.leadFlowState,
      }),
    }
  )
);
