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

/**
 * Maps a table row (from leads list) and/or raw API records to the same shape as the add form (INITIAL_LEAD)
 * so /leads/new can reuse the exact same form for edit.
 */
export function rowToInitialLead(row) {
  if (!row) return null;
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
    deliverableTypes: normalizeDeliverableTypes(row),
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
    paymentTerms: pickText(row.paymentTerms, row.payment_terms),
    gstApplicable: pickText(row.gstApplicable, row.gst_applicable) || "Yes",
    expectedExpenses: pickText(row.expectedExpenses, row.expected_expenses),
    revenueModel: pickText(row.revenueModel, row.revenue_model),
    invoiceEntity: pickText(row.invoiceEntity, row.invoice_entity),
    discountTerms: pickText(row.discountTerms, row.discount_terms),
    proposalLink: pickText(row.proposalLink, row.proposal_link),
    sowStatus: pickText(row.sowStatus, row.sow_status),
    poStatus: pickText(row.poStatus, row.po_status),
    proposalDueDate: sliceDateIso(pickText(row.proposalDueDate, row.proposal_due_date)),
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
