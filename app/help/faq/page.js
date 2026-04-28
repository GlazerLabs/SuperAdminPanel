"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteApi, getApi, postApi, putApi } from "@/api";

const FAQ_CATEGORIES = [
  { id: "tournament", label: "Tournament", icon: "🏆", tone: "from-indigo-50 to-violet-50", border: "border-indigo-100" },
  { id: "payment", label: "Payment", icon: "💳", tone: "from-amber-50 to-yellow-50", border: "border-amber-100" },
  { id: "general", label: "General", icon: "❓", tone: "from-emerald-50 to-teal-50", border: "border-emerald-100" },
];

const PAGE_LIMIT = 10;

const pickNumber = (...vals) => {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const normalizeFaqRows = (payload) => {
  const dataArr = Array.isArray(payload?.data) ? payload.data : [];
  const firstBlock = dataArr[0] ?? {};
  const root = payload?.data ?? payload;
  const rows = Array.isArray(firstBlock?.items)
    ? firstBlock.items
    : Array.isArray(root?.items)
      ? root.items
      : Array.isArray(root?.rows)
        ? root.rows
        : Array.isArray(root?.list)
          ? root.list
          : Array.isArray(root?.faqs)
            ? root.faqs
            : Array.isArray(root?.data)
              ? root.data
              : Array.isArray(root)
                ? root
                : [];

  return rows
    .map((item) => ({
      id: item?.faq_id ?? item?.id,
      category: String(item?.category ?? "").toLowerCase(),
      subCategory: item?.issue_type ?? item?.subCategory ?? "",
      question: item?.question ?? "",
      answer: item?.answer ?? "",
      active: Number(item?.is_active ?? 0) === 1 || item?.is_active === true,
      sortOrder: pickNumber(item?.sort_order, item?.sortOrder) ?? null,
    }))
    .filter((row) => row.id !== undefined && row.id !== null);
};

export default function HelpFaqPage() {
  const [faqRows, setFaqRows] = useState([]);
  const [activeCategory, setActiveCategory] = useState("tournament");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [issueType, setIssueType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [faqPage, setFaqPage] = useState(1);
  const [hasMoreFaqs, setHasMoreFaqs] = useState(true);
  const [countsByCategory, setCountsByCategory] = useState({});
  const [issueTypeOptions, setIssueTypeOptions] = useState([]);
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(false);
  const [modalIssueTypeOptions, setModalIssueTypeOptions] = useState([]);
  const [isLoadingModalIssueTypes, setIsLoadingModalIssueTypes] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionOk, setActionOk] = useState("");
  const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);
  const [isDeletingFaq, setIsDeletingFaq] = useState(false);
  const [togglingFaqId, setTogglingFaqId] = useState(null);
  const [editingFaqId, setEditingFaqId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTargetFaq, setDeleteTargetFaq] = useState(null);
  const sentinelRef = useRef(null);
  const [newFaq, setNewFaq] = useState({
    category: "tournament",
    subCategory: "",
    sortOrder: "",
    status: "active",
    question: "",
    answer: "",
  });

  const loadIssueTypes = useCallback(async (category) => {
    setIsLoadingIssueTypes(true);
    try {
      const response = await getApi("support/issue-types", { category });
      const dataArr = Array.isArray(response?.data) ? response.data : [];
      const firstBlock = dataArr[0] ?? {};
      const rows = Array.isArray(firstBlock?.issue_types)
        ? firstBlock.issue_types
        : Array.isArray(response?.issue_types)
          ? response.issue_types
          : [];
      const options = rows
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.key ?? item?.label ?? item?.issue_type ?? item?.name ?? "";
        })
        .map((value) => String(value).trim())
        .filter(Boolean);
      setIssueTypeOptions(Array.from(new Set(options)).sort((a, b) => a.localeCompare(b)));
    } catch {
      setIssueTypeOptions([]);
    } finally {
      setIsLoadingIssueTypes(false);
    }
  }, []);

  const loadModalIssueTypes = useCallback(async (category) => {
    setIsLoadingModalIssueTypes(true);
    try {
      const response = await getApi("support/issue-types", { category });
      const dataArr = Array.isArray(response?.data) ? response.data : [];
      const firstBlock = dataArr[0] ?? {};
      const rows = Array.isArray(firstBlock?.issue_types)
        ? firstBlock.issue_types
        : Array.isArray(response?.issue_types)
          ? response.issue_types
          : [];
      const options = rows
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.key ?? item?.label ?? item?.issue_type ?? item?.name ?? "";
        })
        .map((value) => String(value).trim())
        .filter(Boolean);
      setModalIssueTypeOptions(Array.from(new Set(options)).sort((a, b) => a.localeCompare(b)));
    } catch {
      setModalIssueTypeOptions([]);
    } finally {
      setIsLoadingModalIssueTypes(false);
    }
  }, []);

  const loadFaqs = useCallback(async (page, shouldAppend) => {
    const loadingSetter = shouldAppend ? setIsLoadingMore : setIsLoadingFaqs;
    loadingSetter(true);
    setActionError("");
    try {
      const params = {
        page,
        limit: PAGE_LIMIT,
        category: activeCategory,
      };
      if (statusFilter !== "all") params.is_active = statusFilter === "active" ? 1 : 0;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (issueType !== "all") params.issue_type = issueType;

      const response = await getApi("support/faq", params);
      const rows = normalizeFaqRows(response);
      const dataArr = Array.isArray(response?.data) ? response.data : [];
      const firstBlock = dataArr[0] ?? {};
      const root = response?.data ?? response;
      const meta = response?.meta ?? root?.meta ?? {};
      const total = pickNumber(
        firstBlock?.total,
        firstBlock?.totalCount,
        firstBlock?.total_count,
        meta.total,
        meta.totalCount,
        meta.total_count,
        root?.total,
        root?.totalCount,
        root?.total_count
      );
      const serverPage = pickNumber(firstBlock?.page, meta.page, root?.page) ?? page;
      const apiCategoryCount = meta?.category_count && typeof meta.category_count === "object" ? meta.category_count : null;

      setFaqRows((prev) => (shouldAppend ? [...prev, ...rows] : rows));
      setFaqPage(serverPage);
      setHasMoreFaqs(total !== null ? serverPage * PAGE_LIMIT < total : rows.length === PAGE_LIMIT);
      setCountsByCategory((prev) =>
        apiCategoryCount
          ? { ...prev, ...apiCategoryCount }
          : {
              ...prev,
              [activeCategory]: total !== null ? total : shouldAppend ? (prev[activeCategory] || 0) + rows.length : rows.length,
            }
      );
    } catch (error) {
      setActionError(error?.message || "Failed to load FAQs.");
      if (!shouldAppend) setFaqRows([]);
      setHasMoreFaqs(false);
    } finally {
      loadingSetter(false);
    }
  }, [activeCategory, debouncedSearch, issueType, statusFilter]);

  const totalFaqs = faqRows.length;

  useEffect(() => {
    setIssueType("all");
    loadIssueTypes(activeCategory);
  }, [activeCategory, loadIssueTypes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (search === "") {
      setDebouncedSearch("");
    }
  }, [search]);

  useEffect(() => {
    if (!isAddModalOpen || !newFaq.category) return;
    loadModalIssueTypes(newFaq.category);
  }, [isAddModalOpen, newFaq.category, loadModalIssueTypes]);

  useEffect(() => {
    loadFaqs(1, false);
  }, [loadFaqs]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreFaqs || isLoadingFaqs || isLoadingMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadFaqs(faqPage + 1, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [faqPage, hasMoreFaqs, isLoadingFaqs, isLoadingMore, loadFaqs]);

  const openAddFaqModal = (category = activeCategory, existingFaq = null) => {
    setActionError("");
    setActionOk("");
    setEditingFaqId(existingFaq?.id ?? null);
    setNewFaq({
      category: existingFaq?.category ?? category,
      subCategory: existingFaq?.subCategory ?? "",
      sortOrder: existingFaq?.sortOrder != null ? String(existingFaq.sortOrder) : "",
      status: existingFaq?.active ? "active" : "inactive",
      question: existingFaq?.question ?? "",
      answer: existingFaq?.answer ?? "",
    });
    setIsAddModalOpen(true);
  };

  const handleCreateFaq = async () => {
    const trimmedQuestion = newFaq.question.trim();
    const trimmedAnswer = newFaq.answer.trim();
    const trimmedIssue = newFaq.subCategory.trim();
    const sortOrder = Number(newFaq.sortOrder || 0);

    if (!trimmedQuestion || !trimmedAnswer || !trimmedIssue) return;

    setIsSubmittingFaq(true);
    setActionError("");
    setActionOk("");

    try {
      if (editingFaqId) {
        await putApi("support/faq", {
          faq_id: Number(editingFaqId),
          question: trimmedQuestion,
          answer: trimmedAnswer,
          issue_type: trimmedIssue,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          is_active: newFaq.status === "active" ? 1 : 0,
        });
        setActionOk("FAQ updated successfully.");
      } else {
        await postApi("support/faq", {
          question: trimmedQuestion,
          answer: trimmedAnswer,
          category: newFaq.category,
          issue_type: trimmedIssue,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          is_active: newFaq.status === "active" ? 1 : 0,
        });
        setActionOk("FAQ created successfully.");
      }
      setIsAddModalOpen(false);
      setActiveCategory(newFaq.category);
      await loadFaqs(1, false);
    } catch (error) {
      setActionError(error?.message || "Unable to save FAQ.");
    } finally {
      setIsSubmittingFaq(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!deleteTargetFaq?.id) return;
    setIsDeletingFaq(true);
    setActionError("");
    setActionOk("");
    try {
      await deleteApi(`support/faq/${deleteTargetFaq.id}`);
      setActionOk("FAQ deleted successfully.");
      setDeleteTargetFaq(null);
      await loadFaqs(1, false);
    } catch (error) {
      setActionError(error?.message || "Unable to delete FAQ.");
    } finally {
      setIsDeletingFaq(false);
    }
  };

  const handleToggleFaqStatus = async (row) => {
    if (!row?.id) return;
    setTogglingFaqId(row.id);
    setActionError("");
    setActionOk("");
    try {
      await putApi("support/faq", {
        faq_id: Number(row.id),
        is_active: row.active ? 0 : 1,
      });
      setFaqRows((prev) =>
        prev.map((faq) =>
          String(faq.id) === String(row.id) ? { ...faq, active: !row.active } : faq
        )
      );
      setActionOk("FAQ status updated.");
    } catch (error) {
      setActionError(error?.message || "Unable to update FAQ status.");
    } finally {
      setTogglingFaqId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7ff] pb-10">
      <section className="rounded-2xl border border-indigo-100/70 bg-white p-5 shadow-sm ring-1 ring-white/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">FAQ Manager</h1>
            <p className="mt-1 text-sm text-slate-500">{totalFaqs} questions across 3 categories</p>
          </div>
          <button
            type="button"
            onClick={() => openAddFaqModal(activeCategory)}
            className="rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25"
          >
            + Add FAQ
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FAQ_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setActiveCategory(category.id);
                setIssueType("all");
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                activeCategory === category.id
                  ? `${category.border} bg-linear-to-r ${category.tone} shadow-sm`
                  : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-slate-100">
                  {category.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">{category.label} (inbox)</p>
                  <p className="mt-0.5 text-4xl font-black leading-none text-slate-900">{countsByCategory[category.id] || 0}</p>
                </div>
                <span
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-xs font-bold ${
                    activeCategory === category.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  —
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
          {FAQ_CATEGORIES.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setActiveCategory(category.id);
                  setIssueType("all");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {category.label} ({countsByCategory[category.id] || 0})
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            placeholder="Search FAQ..."
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">{isLoadingIssueTypes ? "Loading issue types..." : "All issue types"}</option>
            {issueTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-indigo-100/70 bg-white p-4 shadow-sm ring-1 ring-white/70">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            {activeCategory} · {faqRows.length} loaded
          </p>
          <button
            type="button"
            onClick={() => openAddFaqModal(activeCategory)}
            className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            + Add
          </button>
        </div>

        {actionError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {actionOk ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-700">
            {actionOk}
          </div>
        ) : null}

        {isLoadingFaqs ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Loading FAQs...
          </div>
        ) : faqRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No FAQs found for the current filters.
          </div>
        ) : (
          faqRows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{row.question}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      {row.subCategory}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleFaqStatus(row)}
                    disabled={togglingFaqId === row.id}
                    aria-label={row.active ? "Disable FAQ" : "Enable FAQ"}
                    className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${
                      row.active ? "bg-emerald-400 justify-end" : "bg-slate-300 justify-start"
                    } ${togglingFaqId === row.id ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span className="h-4 w-4 rounded-full bg-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddFaqModal(activeCategory, row)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetFaq(row)}
                    className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="mt-3 text-[15px] leading-7 text-slate-700">{row.answer}</p>
            </article>
          ))
        )}
        <div ref={sentinelRef} className="h-2 w-full" />
        {isLoadingMore ? <p className="text-center text-xs font-medium text-slate-500">Loading more FAQs...</p> : null}
      </section>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-r from-indigo-500 to-violet-500 text-lg text-white shadow-md shadow-indigo-500/30">
                    💬
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create FAQ</h2>
                    <p className="text-sm text-slate-500">Add a question with category, issue type, and status.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close add faq modal"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Category</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {FAQ_CATEGORIES.map((category) => {
                    const active = newFaq.category === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setNewFaq((prev) => ({ ...prev, category: category.id }))}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-indigo-500 bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Issue Type</span>
                  <select
                    value={newFaq.subCategory}
                    onChange={(e) => setNewFaq((prev) => ({ ...prev, subCategory: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">
                      {isLoadingModalIssueTypes ? "Loading issue types..." : "Select issue type"}
                    </option>
                    {newFaq.subCategory && !modalIssueTypeOptions.includes(newFaq.subCategory) ? (
                      <option value={newFaq.subCategory}>{newFaq.subCategory}</option>
                    ) : null}
                    {modalIssueTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Sort Order</span>
                  <input
                    value={newFaq.sortOrder}
                    onChange={(e) => setNewFaq((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    type="number"
                    min="1"
                    placeholder="1"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Status</span>
                  <select
                    value={newFaq.status}
                    onChange={(e) => setNewFaq((prev) => ({ ...prev, status: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Question</span>
                <input
                  value={newFaq.question}
                  onChange={(e) => setNewFaq((prev) => ({ ...prev, question: e.target.value }))}
                  type="text"
                  placeholder="Type the FAQ question"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Answer</span>
                <textarea
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq((prev) => ({ ...prev, answer: e.target.value }))}
                  rows={6}
                  placeholder="Write a clear and helpful answer"
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFaq}
                disabled={!newFaq.subCategory.trim() || !newFaq.question.trim() || !newFaq.answer.trim()}
                className="rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition enabled:hover:from-indigo-600 enabled:hover:to-violet-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSubmittingFaq ? "Saving..." : editingFaqId ? "Update FAQ" : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTargetFaq ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-lg text-rose-700">
                !
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete FAQ?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Are you sure you want to delete this FAQ? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Question:</span> {deleteTargetFaq.question}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetFaq(null)}
                disabled={isDeletingFaq}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFaq}
                disabled={isDeletingFaq}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isDeletingFaq ? "Deleting..." : "Delete FAQ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
