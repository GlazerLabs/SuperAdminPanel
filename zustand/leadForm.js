"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Maps a table row (from leads list) to the same shape as the add form (INITIAL_LEAD)
 * so /leads/new can reuse the exact same form for edit.
 */
export function rowToInitialLead(row) {
  if (!row) return null;
  return {
    brand: row.brand ?? "",
    activityName: row.activityName ?? "",
    leadOwner: row.leadOwner ?? "",
    currentStatus: row.currentStatus ?? "",
    nextFollowUpDate: row.nextFollowUpDate ?? "",
    nextStep: row.nextStep ?? "",
    primaryChannel: row.primaryChannel ?? "",
    leadSource: row.leadSource ?? "",
    cityRegion: row.cityRegion ?? "",
    mode: row.mode ?? "",
    activityType: row.activityType ?? "",
    priority: row.priority ?? "",
    tags: row.tags ?? "",
    primaryContactName: row.primaryContactName ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    role: row.role ?? "",
    decisionMakerKnown: row.decisionMakerKnown ?? "No",
    decisionMakerName: row.decisionMakerName ?? "",
    decisionMakerRole: row.decisionMakerRole ?? "",
    procurementContact: row.procurementContact ?? "",
    agencyInvolved: row.agencyInvolved ?? "",
    preferredContactTime: row.preferredContactTime ?? "",
    objective: row.objective ?? "",
    deliverableTypes: Array.isArray(row.deliverableTypes) ? row.deliverableTypes : [],
    activityDate: row.activityDate ?? "",
    activityWindowFrom: row.activityWindowFrom ?? "",
    activityWindowTo: row.activityWindowTo ?? "",
    geographyScope: row.geographyScope ?? "",
    participantsEstimate: row.participantsEstimate ?? "",
    gameTitles: row.gameTitles ?? "",
    integrations: row.integrations ?? "",
    successMetrics: row.successMetrics ?? "",
    dependencies: row.dependencies ?? "",
    expectedRevenueType: row.expectedRevenueType ?? "value",
    expectedRevenueValue: row.expectedRevenueValue ?? "",
    expectedRevenueRange: row.expectedRevenueRange ?? "",
    expectedRevenueNote: row.expectedRevenueNote ?? "",
    expenseModel: row.expenseModel ?? "",
    paymentTerms: row.paymentTerms ?? "",
    gstApplicable: row.gstApplicable ?? "Yes",
    expectedExpenses: row.expectedExpenses ?? "",
    revenueModel: row.revenueModel ?? "",
    invoiceEntity: row.invoiceEntity ?? "",
    discountTerms: row.discountTerms ?? "",
    proposalDueDate: row.proposalDueDate ?? "",
  };
}

export const useLeadFormStore = create(
  persist(
    (set) => ({
      selectedLead: null,

      openLeadForm: (lead) => set({ selectedLead: lead }),

      closeLeadForm: () => set({ selectedLead: null }),
    }),
    {
      name: "lead-form-storage",
      partialize: (state) => ({ selectedLead: state.selectedLead }),
    }
  )
);
