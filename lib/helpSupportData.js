/** Demo support tickets — replace with API data when wired. */

export const MOCK_TICKETS = [
  {
    id: "t1",
    ticketNo: 12,
    raisedBy: "priyas",
    dateLabel: "Apr 15, 11:47 AM",
    issueType: "Result Dispute",
    userName: "Priya Sharma",
    userEmail: "priya.sharma@example.com",
    initials: "PS",
    tournament: "BGMI Pro League S4",
    tournamentTag: "#101",
    category: "Result Dispute",
    priority: "Urgent",
    status: "open",
    assigned: "—",
    assigneeName: null,
    assigneeInitials: null,
  },
  {
    id: "t2",
    ticketNo: 13,
    raisedBy: "rahulv",
    dateLabel: "Apr 14, 9:22 AM",
    issueType: "Connection Error",
    userName: "Rahul Verma",
    userEmail: "rahul.v@example.com",
    initials: "RV",
    tournament: "Valorant Open Cup",
    tournamentTag: "#88",
    category: "Technical",
    priority: "Medium",
    status: "open",
    assigned: "Alex M.",
    assigneeName: "Alex M.",
    assigneeInitials: "AM",
  },
  {
    id: "t3",
    ticketNo: 14,
    raisedBy: "snehak",
    dateLabel: "Apr 16, 2:05 PM",
    issueType: "Joining Issue",
    userName: "Sneha Kulkarni",
    userEmail: "sneha.k@example.com",
    initials: "SK",
    tournament: "Free Fire Masters",
    tournamentTag: "#204",
    category: "Misconduct",
    priority: "Urgent",
    status: "in_progress",
    assigned: "Sagar Anand",
    assigneeName: "Sagar Anand",
    assigneeInitials: "SA",
  },
  {
    id: "t4",
    ticketNo: 15,
    raisedBy: "arjunm",
    dateLabel: "Apr 13, 4:40 PM",
    issueType: "Lobby Bug",
    userName: "Arjun Mehta",
    userEmail: "arjun.m@example.com",
    initials: "AM",
    tournament: "COD Mobile Rivals",
    tournamentTag: "#56",
    category: "Technical",
    priority: "Medium",
    status: "resolved",
    assigned: "Priya S.",
    assigneeName: "Priya S.",
    assigneeInitials: "PS",
  },
  {
    id: "t5",
    ticketNo: 16,
    raisedBy: "nehag",
    dateLabel: "Apr 12, 10:15 AM",
    issueType: "Reward Issue",
    userName: "Neha Gupta",
    userEmail: "neha.g@example.com",
    initials: "NG",
    tournament: "BGMI Pro League S4",
    tournamentTag: "#101",
    category: "Result Dispute",
    priority: "Low",
    status: "resolved",
    assigned: "Neha Kaur",
    assigneeInitials: "NK",
  },
];

export function categoryBadgeClass(category) {
  const c = String(category || "").toLowerCase();
  if (c === "tournament") return "bg-sky-100 text-sky-900 ring-1 ring-sky-200/90";
  if (c === "payment") return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90";
  if (c === "general") return "bg-slate-100 text-slate-800 ring-1 ring-slate-200/90";
  if (c.includes("technical")) return "bg-cyan-100 text-blue-900 ring-1 ring-cyan-200/90";
  if (c.includes("misconduct") || c.includes("dispute")) return "bg-rose-100 text-red-800 ring-1 ring-rose-200/90";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export function priorityBadgeClass(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent") return "bg-rose-100 text-red-800 ring-1 ring-rose-200/90";
  if (p === "medium") return "bg-amber-100 text-orange-800 ring-1 ring-amber-200/90";
  if (p === "low") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "open") return "bg-sky-100 text-blue-900 ring-1 ring-sky-200/90";
  if (s === "in_progress") return "bg-orange-100 text-orange-900 ring-1 ring-orange-200/90";
  if (s === "resolved") return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90";
  if (s === "closed") return "bg-slate-200 text-slate-800 ring-1 ring-slate-300";
  return "border border-slate-200 bg-white text-slate-700";
}

export function formatStatusLabel(status) {
  const s = String(status || "").replace(/_/g, " ");
  return s || "—";
}

/** Card grid: priority pill with border emphasis (design reference). */
export function cardPriorityClass(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent") return "border-2 border-rose-400 bg-rose-50 text-rose-800";
  if (p === "medium") return "border-2 border-amber-400 bg-amber-50 text-amber-900";
  if (p === "low") return "border-2 border-slate-300 bg-slate-50 text-slate-700";
  return "border-2 border-slate-200 bg-white text-slate-700";
}

export function statusDotClass(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "open") return "bg-rose-500";
  if (s === "in_progress") return "bg-amber-500";
  if (s === "resolved") return "bg-emerald-500";
  if (s === "closed") return "bg-slate-400";
  return "bg-slate-400";
}

/** Chat icon square — tint follows ticket status. */
export function cardIconShellClass(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "open") return "bg-rose-100 text-rose-600 ring-rose-200/80";
  if (s === "in_progress") return "bg-violet-100 text-violet-600 ring-violet-200/80";
  if (s === "resolved") return "bg-emerald-100 text-emerald-600 ring-emerald-200/80";
  if (s === "closed") return "bg-slate-100 text-slate-600 ring-slate-200/80";
  return "bg-indigo-100 text-indigo-600 ring-indigo-200/80";
}

export function cardStatusPillClass(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "open") return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
  if (s === "in_progress") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  if (s === "resolved") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  if (s === "closed") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-800 ring-1 ring-slate-200";
}
