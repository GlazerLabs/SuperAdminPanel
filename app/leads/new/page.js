"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { postApi, patchApi } from "@/api";
import { useLeadFormStore, rowToInitialLead } from "@/zustand/leadForm";

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

const STEP_DEFINITIONS = [
  { id: 1, title: "Lead basics" },
  { id: 2, title: "Contacts & stakeholders" },
  { id: 3, title: "Requirements & plan" },
  { id: 4, title: "Commercials" },
];

const INITIAL_LEAD = {
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

function createDefaultWorkspace(rootName) {
  return {
    id: "root",
    name: rootName || "Lead Workspace",
    folders: [
      {
        id: "client-inflows",
        name: "Client Inflows (Investor Receivables)",
        folders: [],
        images: [],
      },
      {
        id: "campaign-outflows",
        name: "Campaign Outflows (Execution Disbursements)",
        folders: [],
        images: [],
      },
    ],
    images: [],
  };
}

function findFolderByPath(node, pathIds) {
  let current = node;
  for (const id of pathIds) {
    current = current?.folders?.find((folder) => folder.id === id);
    if (!current) return null;
  }
  return current;
}

function addFolderAtPath(node, pathIds, folderName) {
  if (!folderName?.trim()) return node;
  const newFolder = {
    id: `folder-${Date.now()}`,
    name: folderName.trim(),
    folders: [],
    images: [],
  };

  if (pathIds.length === 0) {
    return {
      ...node,
      folders: [...node.folders, newFolder],
    };
  }

  const [head, ...tail] = pathIds;
  return {
    ...node,
    folders: node.folders.map((folder) => {
      if (folder.id !== head) return folder;
      if (tail.length === 0) {
        return { ...folder, folders: [...folder.folders, newFolder] };
      }
      return addFolderAtPath(folder, tail, folderName);
    }),
  };
}

function addImagesAtPath(node, pathIds, files) {
  const toImageItem = (file) => ({
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    size: file.size,
  });

  if (pathIds.length === 0) {
    return {
      ...node,
      images: [...(node.images || []), ...files.map(toImageItem)],
    };
  }

  const [head, ...tail] = pathIds;
  return {
    ...node,
    folders: node.folders.map((folder) => {
      if (folder.id !== head) return folder;
      if (tail.length === 0) {
        return {
          ...folder,
          images: [...(folder.images || []), ...files.map(toImageItem)],
        };
      }
      return addImagesAtPath(folder, tail, files);
    }),
  };
}

export default function NewLeadPage() {
  const router = useRouter();
  const { selectedLead, closeLeadForm } = useLeadFormStore();
  const isEditMode = !!selectedLead?.id;

  const [lead, setLead] = useState(INITIAL_LEAD);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [workspaceTree, setWorkspaceTree] = useState(() => createDefaultWorkspace(""));
  const [activeFolderPath, setActiveFolderPath] = useState([]);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (selectedLead) {
      setLead(rowToInitialLead(selectedLead));
    } else {
      setLead(INITIAL_LEAD);
    }
  }, [selectedLead]);

  useEffect(() => {
    const leadName =
      lead.activityName?.trim() ||
      selectedLead?.activityName?.trim() ||
      selectedLead?.activity?.trim() ||
      "Lead Workspace";
    setWorkspaceTree((prev) => ({
      ...prev,
      name: leadName,
    }));
  }, [lead.activityName, selectedLead]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setLead((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleDeliverableToggle = (value) => {
    setLead((prev) => {
      const current = new Set(prev.deliverableTypes);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, deliverableTypes: Array.from(current) };
    });
  };

  const validateStep = () => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!lead.brand.trim()) nextErrors.brand = "Brand is required.";
      if (!lead.activityName.trim()) nextErrors.activityName = "Activity / campaign name is required.";
      if (!lead.leadOwner.trim()) nextErrors.leadOwner = "Lead owner is required.";
      if (!lead.currentStatus) nextErrors.currentStatus = "Status is required.";
      if (!lead.nextFollowUpDate) nextErrors.nextFollowUpDate = "Next follow-up is required.";
      if (!lead.nextStep.trim()) nextErrors.nextStep = "Next step is required.";
      if (!lead.primaryChannel) nextErrors.primaryChannel = "Channel is required.";
    } else if (currentStep === 2) {
      if (!lead.primaryContactName.trim()) nextErrors.primaryContactName = "Contact name is required.";
      if (!lead.phone.trim() && !lead.email.trim()) {
        nextErrors.phone = "Phone or email is required.";
        nextErrors.email = "Phone or email is required.";
      }
      if (!lead.role.trim()) nextErrors.role = "Role / designation is required.";
    } else if (currentStep === 3) {
      if (!lead.objective.trim()) nextErrors.objective = "Objective is required.";
      if (!lead.deliverableTypes.length) {
        nextErrors.deliverableTypes = "Select at least one deliverable.";
      }
      if (!lead.activityDate && !(lead.activityWindowFrom && lead.activityWindowTo)) {
        nextErrors.activityDate = "Provide date or window.";
      }
      if (!lead.geographyScope.trim()) {
        nextErrors.geographyScope = "Scope summary is required.";
      }
    } else if (currentStep === 4) {
      if (!lead.expectedRevenueType) nextErrors.expectedRevenueType = "Type is required.";
      if (lead.expectedRevenueType === "value" && !lead.expectedRevenueValue.trim()) {
        nextErrors.expectedRevenueValue = "Expected value is required.";
      }
      if (lead.expectedRevenueType === "range" && !lead.expectedRevenueRange.trim()) {
        nextErrors.expectedRevenueRange = "Expected range is required.";
      }
      if (!lead.expenseModel) nextErrors.expenseModel = "Expense model is required.";
      if (!lead.paymentTerms) nextErrors.paymentTerms = "Payment terms are required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep((s) => Math.min(STEP_DEFINITIONS.length, s + 1));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  const handleCancel = () => {
    if (isEditMode) closeLeadForm();
    router.push("/leads");
  };

  const handleSubmit = async () => {
    if (!validateStep() || submitting) return;

    setSubmitting(true);
    try {
      if (isEditMode && selectedLead?.id) {
        const valueBefore = Number(String(selectedLead.expectedRevenueValue || "0").replace(/[^0-9.]/g, "")) || 0;
        const valueAfter =
          lead.expectedRevenueType === "value"
            ? Number(String(lead.expectedRevenueValue).replace(/[^0-9.]/g, "")) || 0
            : 0;
        const expenseBefore = Number(String(selectedLead.expectedExpenses || "0").replace(/[^0-9.]/g, "")) || 0;
        const expenseAfter = Number(String(lead.expectedExpenses || "0").replace(/[^0-9.]/g, "")) || 0;
        const payload = {
          brand: lead.brand,
          update_date: new Date().toISOString().split("T")[0],
          channel: lead.primaryChannel || "",
          update_type: "Follow-up",
          discussion_summary: lead.objective || "",
          client_sentiment: "Neutral",
          outcome: "Progressed",
          stage_before: lead.currentStatus || "",
          stage_after: lead.currentStatus || "",
          value_before: valueBefore,
          value_after: valueAfter,
          expense_before: expenseBefore,
          expense_after: expenseAfter,
          next_action: lead.nextStep || "",
          next_follow_up_date: lead.nextFollowUpDate || "",
          expected_activity_date: lead.activityDate || "",
          expected_closure_date: lead.nextFollowUpDate || "",
          risks_blockers: "",
          dependencies: lead.dependencies || "",
          links_attachments: "",
          internal_notes: "",
        };
        await patchApi(`lead-tracking/${selectedLead.id}`, payload);
        closeLeadForm();
        router.push("/leads");
      } else {
        const expectedRevenue =
          lead.expectedRevenueType === "value"
            ? Number(String(lead.expectedRevenueValue).replace(/[^0-9.]/g, "")) || 0
            : 0;
        const expectedExpenses =
          lead.expectedExpenses
            ? Number(String(lead.expectedExpenses).replace(/[^0-9.]/g, "")) || 0
            : 0;
        const grossMargin = expectedRevenue - expectedExpenses;
        const marginPercent =
          expectedRevenue > 0 ? Number(((grossMargin / expectedRevenue) * 100).toFixed(1)) : 0;

        const payload = {
          brand: lead.brand,
          account_type: "New",
          activity: lead.activityName,
          mode: lead.mode || "",
          activity_type: lead.activityType || "",
          industry: "",
          city_region: lead.cityRegion || "",
          lead_source: lead.leadSource || "",
          primary_contact: lead.primaryContactName || "",
          designation: lead.role || "",
          phone: lead.phone || "",
          email: lead.email || "",
          decision_maker: lead.decisionMakerName || "",
          stage: lead.currentStatus || "New",
          expected_revenue: expectedRevenue,
          expected_expenses: expectedExpenses,
          gross_margin: grossMargin,
          margin_percent: marginPercent,
          payment_terms: lead.paymentTerms || "",
          gst_applicable: lead.gstApplicable || "Yes",
          proposal_link: "",
          sow_contract_status: "",
          po_status: "",
          current_status: lead.currentStatus || "New",
          current_status_summary: lead.objective || "",
          next_step: lead.nextStep || "",
          priority: lead.priority || "",
          risk_blockers: lead.risks || "",
          dependencies: lead.dependencies || "",
          attachments_links: "",
        };
        if (lead.nextFollowUpDate) {
          payload.expected_closure_date = lead.nextFollowUpDate;
          payload.next_follow_up_date = lead.nextFollowUpDate;
        }
        if (lead.activityDate) {
          payload.expected_activity_date = lead.activityDate;
        }
        await postApi("lead-tracking", payload);
        router.push("/leads");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(isEditMode ? "Failed to update lead" : "Failed to create lead", error);
    } finally {
      setSubmitting(false);
    }
  };

  const activeFolder = findFolderByPath(workspaceTree, activeFolderPath) || workspaceTree;
  const breadcrumbs = [workspaceTree, ...activeFolderPath.reduce((acc, id) => {
    const parent = acc.length ? acc[acc.length - 1] : workspaceTree;
    const next = parent.folders.find((folder) => folder.id === id);
    if (next) acc.push(next);
    return acc;
  }, [])];

  const handleCreateFolder = () => {
    const folderName = window.prompt("Enter folder name");
    if (!folderName?.trim()) return;
    setWorkspaceTree((prev) => addFolderAtPath(prev, activeFolderPath, folderName));
  };

  const handleUploadClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    setWorkspaceTree((prev) => addImagesAtPath(prev, activeFolderPath, files));
    e.target.value = "";
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
            {isEditMode ? "Update lead" : "New lead"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {isEditMode ? `${lead.activityName || "Lead"} · ${lead.brand || ""}` : "Create brand lead"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isEditMode
              ? "Edit details in the same step-wise flow."
              : "Capture all key details in a guided, step-wise flow."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowWorkspace(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <span aria-hidden="true">📁</span>
          Open lead folders
        </button>
      </div>

      {showWorkspace && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 p-2 backdrop-blur-[1px] md:p-4"
          onClick={() => setShowWorkspace(false)}
        >
          <section
            className="mx-auto h-[96vh] w-full max-w-[96vw] overflow-hidden rounded-2xl bg-[#f8fafd] shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="hidden text-sm font-semibold text-slate-600 md:block">Lead Drive</div>
                <div className="relative flex-1">
                  <svg
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.65" y1="16.65" x2="21" y2="21" />
                  </svg>
                  <input
                    type="text"
                    value=""
                    readOnly
                    placeholder="Search in Drive"
                    className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowWorkspace(false)}
                  className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="hidden border-r border-slate-200 bg-white px-3 py-4 md:block">
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    <span className="text-base">+</span>
                    New
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="mb-5 ml-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    <span aria-hidden="true">🖼️</span>
                    Upload
                  </button>
                  <nav className="space-y-1 text-sm">
                    <button type="button" className="block w-full rounded-lg bg-indigo-50 px-3 py-2 text-left font-medium text-indigo-700">
                      My Drive
                    </button>
                    <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100">
                      Shared
                    </button>
                    <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100">
                      Recent
                    </button>
                    <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100">
                      Starred
                    </button>
                  </nav>
                </aside>

                <div className="min-h-0 overflow-y-auto p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                        Deal workspace
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-900">{workspaceTree.name}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 md:hidden"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      New folder
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
                    >
                      <span aria-hidden="true">🖼️</span>
                      Upload image
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1 text-xs">
                    {breadcrumbs.map((crumb, index) => (
                      <button
                        key={crumb.id}
                        type="button"
                        onClick={() => setActiveFolderPath(activeFolderPath.slice(0, Math.max(0, index)))}
                        className={`rounded-md px-2 py-1 ${
                          index === breadcrumbs.length - 1
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        }`}
                      >
                        {crumb.name}
                      </button>
                    ))}
                  </div>

                  {activeFolderPath.length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setActiveFolderPath((prev) => prev.slice(0, -1))}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        ← Back to parent
                      </button>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {activeFolder.folders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-xs text-slate-500">
                        No folders yet. Click &quot;New folder&quot; to create one in this location.
                      </div>
                    ) : (
                      activeFolder.folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setActiveFolderPath((prev) => [...prev, folder.id])}
                          className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
                        >
                          <span className="mt-0.5 text-xl" aria-hidden="true">📁</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                              {folder.name}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {folder.folders.length} subfolders · {(folder.images || []).length} images
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  {(activeFolder.images || []).length > 0 && (
                    <div className="mt-7">
                      <h3 className="text-sm font-semibold text-slate-900">Images</h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {activeFolder.images.map((image) => (
                          <div
                            key={image.id}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                          >
                            <img
                              src={image.url}
                              alt={image.name}
                              className="h-32 w-full object-cover"
                            />
                            <div className="px-2 py-2">
                              <p className="truncate text-xs font-medium text-slate-800">{image.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {(image.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="lead-form space-y-5 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/80 ring-1 ring-indigo-100">
        {/* Stepper */}
        <div className="relative">
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200" />
          <ol className="relative z-10 flex justify-between gap-2">
            {STEP_DEFINITIONS.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <li key={step.id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
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
          {currentStep === 1 && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Step 1 · Lead basics</h2>
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
                  {errors.nextStep && (
                    <p className="mt-1 text-xs text-rose-600">{errors.nextStep}</p>
                  )}
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
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Step 2 · Contacts &amp; stakeholders
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Capture the people who will make this deal move.
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
                  <label className="block text-sm font-medium text-slate-700">Phone</label>
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
                  <label className="block text-sm font-medium text-slate-700">Email</label>
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
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Step 3 · Requirements &amp; plan
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  What will we deliver and when.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Objective <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={lead.objective}
                    onChange={handleChange("objective")}
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
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.deliverableTypes}
                    </p>
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
                  <p className="text-xs text-rose-600">{errors.activityDate}</p>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Geography / scope summary <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={lead.geographyScope}
                    onChange={handleChange("geographyScope")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="E.g. India-wide, Tier 1 only, key campuses, etc."
                  />
                  {errors.geographyScope && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.geographyScope}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {currentStep === 4 && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Step 4 · Commercials</h2>
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
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.expenseModel}
                      </p>
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
                    </select>
                    {errors.paymentTerms && (
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.paymentTerms}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      GST applicable?
                    </label>
                    <div className="mt-1 flex gap-2">
                      {["Yes", "No"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setLead((prev) => ({ ...prev, gstApplicable: value }))
                          }
                          className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
                            lead.gstApplicable === value
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Navigation */}
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
              onClick={handleCancel}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            {currentStep < STEP_DEFINITIONS.length && (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Next step
              </button>
            )}
            {currentStep === STEP_DEFINITIONS.length && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving…" : isEditMode ? "Update lead" : "Save lead"}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

