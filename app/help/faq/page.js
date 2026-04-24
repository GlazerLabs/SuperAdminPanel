"use client";

import { useMemo, useState } from "react";

const FAQ_CATEGORIES = [
  { id: "tournament", label: "Tournament", icon: "🏆", tone: "from-indigo-50 to-violet-50", border: "border-indigo-100" },
  { id: "payment", label: "Payment", icon: "💳", tone: "from-amber-50 to-yellow-50", border: "border-amber-100" },
  { id: "general", label: "General", icon: "❓", tone: "from-emerald-50 to-teal-50", border: "border-emerald-100" },
];

const FAQ_ROWS = [
  {
    id: "t-1",
    category: "tournament",
    subCategory: "Registration issue",
    question: "How do I register for a tournament or scrim?",
    answer:
      "Complete your profile, create your team, and fill all required team details. Invite your teammates so the team has 4 players. Once your THRYL code is generated, register the team in any tournament or scrim.",
    active: true,
  },
  {
    id: "t-2",
    category: "tournament",
    subCategory: "Joining issue",
    question: "I am unable to join the room.",
    answer:
      "All matches are held in League Rooms. Use your registered team name while entering the room. Incorrect names may lead to disqualification.",
    active: true,
  },
  { id: "t-3", category: "tournament", subCategory: "Slots", question: "Why is my slot not confirmed?", answer: "Slots are confirmed only after successful registration and approval by tournament rules.", active: true },
  { id: "t-4", category: "tournament", subCategory: "Roster", question: "Can I change players after registration?", answer: "Roster edits depend on tournament lock rules. Check the tournament details for deadline and lock time.", active: true },
  { id: "t-5", category: "tournament", subCategory: "Check-in", question: "Where can I complete tournament check-in?", answer: "Open the tournament page and use the check-in action before the round start time.", active: true },
  { id: "t-6", category: "tournament", subCategory: "Match result", question: "How do I report match results?", answer: "Submit the result from match details with valid screenshot proof if requested by admins.", active: true },
  { id: "t-7", category: "tournament", subCategory: "Dispute", question: "How can I raise a dispute?", answer: "Use the support option inside match details and include screenshots or clips for quick resolution.", active: true },
  { id: "t-8", category: "tournament", subCategory: "Schedule", question: "How do I know my next match timing?", answer: "Match timing is available in your tournament bracket and also visible in the match room.", active: false },
  { id: "t-9", category: "tournament", subCategory: "Eligibility", question: "Why is my team marked ineligible?", answer: "Ineligibility appears if roster size, rank, or verification does not meet event requirements.", active: true },
  { id: "p-1", category: "payment", subCategory: "Payout", question: "When will prize payouts be processed?", answer: "After final verification of winners and compliance checks, payout timelines are shared in announcements.", active: true },
  { id: "g-1", category: "general", subCategory: "Profile", question: "How do I update my account details?", answer: "Go to profile settings, update your details, and save. Some fields require verification before changes apply.", active: true },
  { id: "g-2", category: "general", subCategory: "Support", question: "How do I contact support quickly?", answer: "Open Help & Support > Tickets and create a ticket with issue category and screenshots.", active: true },
  { id: "g-3", category: "general", subCategory: "Notifications", question: "How can I control notification preferences?", answer: "Use account settings to configure push/email notifications for events and system alerts.", active: true },
  { id: "g-4", category: "general", subCategory: "Security", question: "How do I secure my account?", answer: "Use a strong password, keep recovery details updated, and avoid sharing OTP with anyone.", active: true },
  { id: "g-5", category: "general", subCategory: "App issue", question: "The app feels slow. What should I do?", answer: "Refresh once, check your network, and clear cache. If issue continues, raise a support ticket with details.", active: true },
  { id: "g-6", category: "general", subCategory: "Policies", question: "Where can I read platform rules?", answer: "Rules and fair-play guidelines are available in the policy section of the platform.", active: true },
  { id: "g-7", category: "general", subCategory: "Team", question: "How do I leave a team?", answer: "Open team settings and use leave team option. You may be blocked if a tournament lock is active.", active: true },
];

export default function HelpFaqPage() {
  const [activeCategory, setActiveCategory] = useState("tournament");
  const [search, setSearch] = useState("");
  const [issueType, setIssueType] = useState("all");

  const counts = useMemo(() => {
    return FAQ_CATEGORIES.reduce((acc, category) => {
      acc[category.id] = FAQ_ROWS.filter((row) => row.category === category.id).length;
      return acc;
    }, {});
  }, []);

  const visibleFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FAQ_ROWS.filter((row) => {
      if (row.category !== activeCategory) return false;
      if (issueType !== "all" && row.subCategory !== issueType) return false;
      if (!q) return true;
      return (
        row.question.toLowerCase().includes(q) ||
        row.answer.toLowerCase().includes(q) ||
        row.subCategory.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, issueType, search]);

  const issueTypeOptions = useMemo(() => {
    const unique = Array.from(new Set(FAQ_ROWS.filter((row) => row.category === activeCategory).map((row) => row.subCategory)));
    return unique.sort();
  }, [activeCategory]);

  const totalFaqs = FAQ_ROWS.length;

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
                  <p className="mt-0.5 text-4xl font-black leading-none text-slate-900">{counts[category.id] || 0}</p>
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
                {category.label} ({counts[category.id] || 0})
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
            <option value="all">All issue types</option>
            {issueTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-indigo-100/70 bg-white p-4 shadow-sm ring-1 ring-white/70">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            {activeCategory} · {visibleFaqs.length} results
          </p>
          <button
            type="button"
            className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            + Add
          </button>
        </div>

        {visibleFaqs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No FAQs found for the current filters.
          </div>
        ) : (
          visibleFaqs.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{row.question}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sub category</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      {row.subCategory}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${
                      row.active ? "bg-emerald-400 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full bg-white" />
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
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
      </section>
    </main>
  );
}
