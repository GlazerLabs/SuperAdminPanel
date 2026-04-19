import { getApi, postApi, putApi } from "@/api";

/** @typedef {'tournament' | 'payment' | 'general'} SupportCategory */

export const SUPPORT_CATEGORIES = /** @type {const} */ (["tournament", "payment", "general"]);

function extractArray(json) {
  if (Array.isArray(json)) return json;
  const d = json?.data ?? json?.result ?? json?.payload;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    if (Array.isArray(d.messages)) return d.messages;
    if (Array.isArray(d.rows)) return d.rows;
    if (Array.isArray(d.tickets)) return d.tickets;
    if (Array.isArray(d.list)) return d.list;
    if (Array.isArray(d.items)) return d.items;
  }
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.tickets)) return d.tickets;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.inbox)) return d.inbox;
  if (Array.isArray(d?.conversations)) return d.conversations;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(json?.rows)) return json.rows;
  return [];
}

/**
 * Messages API may mirror tickets: data: [ { ticket_id, messages: [ ... ] } ] or data: { messages: [...] }.
 */
function flattenTicketMessagesList(json) {
  const data = json?.data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first && Array.isArray(first.messages)) {
      const out = [];
      for (const block of data) {
        if (block && Array.isArray(block.messages)) {
          out.push(...block.messages);
        }
      }
      return out;
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.messages)) {
    return data.messages;
  }
  return null;
}

function pickTotal(json) {
  const meta = json?.meta ?? json?.pagination ?? json?.data?.meta ?? json?.data?.pagination ?? {};
  const n =
    Number(meta.total) ||
    Number(meta.total_count) ||
    Number(meta.totalCount) ||
    Number(json?.total) ||
    Number(json?.count) ||
    Number(json?.data?.total) ||
    Number(json?.data?.total_count) ||
    Number(json?.result?.total) ||
    0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * API shape: { data: [ { conversation_id, tournament_id, user_id, category, tickets: [ {...} ] } ] }
 * Flattens nested tickets and merges parent conversation fields into each ticket row.
 */
function flattenConversationTicketsResponse(json) {
  const data = json?.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  if (!first || !Array.isArray(first.tickets)) return null;

  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const conv of data) {
    if (!conv || typeof conv !== "object") continue;
    const parent = {
      _conversation_id: conv.conversation_id,
      _tournament_id: conv.tournament_id,
      _category: conv.category,
      _user_id: conv.user_id,
    };
    const inner = conv.tickets;
    if (!Array.isArray(inner)) continue;
    for (const t of inner) {
      if (!t || typeof t !== "object") continue;
      out.push({ ...parent, ...t });
    }
  }
  return out;
}

function pickAttachmentUrl(m) {
  if (!m || typeof m !== "object") return null;
  const u =
    m.attachment_url ??
    m.attachmentUrl ??
    m.attachment?.url ??
    m.media_url ??
    m.file_url ??
    m.image_url ??
    (typeof m.attachment === "string" ? m.attachment : null) ??
    (typeof m.file === "string" ? m.file : null);
  const s = typeof u === "string" ? u.trim() : "";
  return s || null;
}

/** Exported for UI: decide image vs file link. */
export function isLikelyImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const path = url.split("?")[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(path) || path.includes("/image");
}

function humanizeIssueType(value) {
  const s = String(value || "")
    .trim()
    .replace(/_/g, " ");
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeStatus(s) {
  const v = String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  if (["open", "in_progress", "resolved", "closed"].includes(v)) return v;
  if (v === "in-progress") return "in_progress";
  return v || "open";
}

function initialsFromName(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

/**
 * Map raw inbox / list row to UI row (flexible field names).
 * @param {Record<string, unknown>} raw
 * @param {SupportCategory} categoryFallback
 */
export function mapInboxRowToUi(raw, categoryFallback = "general") {
  const conversationId = raw.conversation_id ?? raw.conversationId ?? raw.id;
  const userId = raw.user_id ?? raw.userId ?? raw.user?.id ?? raw.user?.user_id;
  const tournamentId = raw.tournament_id ?? raw.tournamentId ?? raw.tournament?.id ?? null;
  const categoryRaw = raw.category ?? raw.support_category ?? raw.type ?? categoryFallback;
  const category = String(categoryRaw || categoryFallback).toLowerCase();

  const userObj = raw.user && typeof raw.user === "object" ? raw.user : raw;
  const userName =
    userObj.full_name ??
    userObj.fullName ??
    userObj.name ??
    userObj.username ??
    userObj.user_name ??
    "—";
  const userEmail = String(userObj.email ?? raw.email ?? "—");

  const tournamentName =
    raw.tournament_name ??
    raw.tournament_title ??
    raw.tournament?.name ??
    (tournamentId != null ? `Tournament #${tournamentId}` : "—");
  const tournamentTag =
    raw.tournament_tag ??
    raw.tournament_hash ??
    (tournamentId != null ? `#${tournamentId}` : "—");

  const priority = String(raw.priority ?? raw.ticket_priority ?? raw.urgency ?? "Medium");
  const status = normalizeStatus(raw.status ?? raw.ticket_status ?? raw.state ?? "open");
  const assigned =
    raw.assigned_to_name ??
    raw.assignee_name ??
    raw.assignee?.name ??
    raw.assigned_name ??
    raw.assigned ??
    "—";

  const rowId = String(conversationId ?? raw.id ?? `${userId}-${tournamentId ?? "na"}`);

  return {
    id: rowId,
    conversationId: conversationId != null ? Number(conversationId) : null,
    userId: userId != null ? Number(userId) : null,
    tournamentId: tournamentId != null ? Number(tournamentId) : null,
    category,
    userName: String(userName),
    userEmail,
    initials: initialsFromName(userName),
    tournament: String(tournamentName),
    tournamentTag: String(tournamentTag),
    priority,
    status,
    assigned: String(assigned),
    _raw: raw,
  };
}

/**
 * GET /support/admin/inbox?category=&status=&page=&limit=
 * @param {{ category: SupportCategory, status?: string, page?: number, limit?: number }} params
 */
export async function fetchSupportInbox(params) {
  const { category, status, page = 1, limit = 20 } = params;
  const query = {
    category,
    page,
    limit,
    ...(status && status !== "all" ? { status } : {}),
  };
  const json = await getApi("support/admin/inbox", query);
  const rows = extractArray(json).map((r) => mapInboxRowToUi(r, category));
  const total = pickTotal(json) || rows.length;
  return { rows, total, raw: json };
}

function mapTicketToCard(raw, categoryFallback) {
  const id = raw.id ?? raw.ticket_id ?? raw.ticketId;
  const ticketNo = raw.ticket_no ?? raw.ticketNo ?? raw.number ?? id;
  const userId =
    raw.user_id ?? raw.userId ?? raw._user_id ?? raw.user?.id;
  const raisedBy =
    raw.raised_by ??
    raw.username ??
    raw.user?.username ??
    raw.user?.user_name ??
    (userId != null && userId !== "" ? `user${userId}` : "user");
  const dateLabel = raw.date_label ?? raw.created_at ?? raw.createdAt ?? raw.updated_at ?? "—";
  const issueRaw = raw.issue_type ?? raw.subject ?? raw.title ?? raw.category ?? "";
  const issueType = humanizeIssueType(issueRaw);
  const priority = String(raw.priority ?? "medium")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  const status = normalizeStatus(raw.status ?? "open");

  const assignedToId = raw.assigned_to_id ?? raw.assigned_to ?? raw.assignee_id ?? null;
  let assigneeName =
    raw.assignee_name ?? raw.assignee?.name ?? raw.assigned_to_name ?? raw.assigned ?? null;
  if ((!assigneeName || assigneeName === "—") && assignedToId != null && assignedToId !== "") {
    assigneeName = `Staff #${assignedToId}`;
  }

  let assigneeInitials = null;
  if (assigneeName && assigneeName !== "—" && !String(assigneeName).startsWith("Staff #")) {
    assigneeInitials = initialsFromName(assigneeName);
  } else if (assignedToId != null && assignedToId !== "") {
    const digits = String(assignedToId).replace(/\D/g, "");
    assigneeInitials = digits.length >= 2 ? digits.slice(0, 2).toUpperCase() : String(assignedToId).slice(0, 2).toUpperCase();
  }

  const cat = String(raw.category ?? raw._category ?? categoryFallback ?? "general").toLowerCase();

  return {
    id: String(id),
    numericId: id != null && id !== "" ? Number(id) : null,
    ticketNo: ticketNo != null && ticketNo !== "" ? Number(ticketNo) || ticketNo : id,
    raisedBy: String(raisedBy),
    dateLabel: typeof dateLabel === "string" && dateLabel.includes("T") ? formatShortDate(dateLabel) : String(dateLabel),
    issueType,
    priority,
    status,
    assigneeName: assigneeName ? String(assigneeName) : null,
    assigneeInitials,
    userId: userId != null && userId !== "" ? Number(userId) : null,
    category: cat,
    _raw: raw,
  };
}

function formatShortDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

/**
 * GET /support/admin/tickets?conversation_id=&user_id=&tournament_id=&category=
 */
export async function fetchSupportTickets(params) {
  const { conversation_id, user_id, tournament_id, category } = params;
  const query = {
    ...(conversation_id != null ? { conversation_id } : {}),
    ...(user_id != null ? { user_id } : {}),
    ...(tournament_id != null ? { tournament_id } : {}),
    ...(category ? { category } : {}),
  };
  const json = await getApi("support/admin/tickets", query);
  const categoryFallback = category || "general";

  const nested = flattenConversationTicketsResponse(json);
  const list = nested ?? extractArray(json);
  const tickets = list.map((r) => mapTicketToCard(r, categoryFallback));
  return { tickets, raw: json };
}

/**
 * GET /support/admin/ticket-messages?ticket_id=&user_id=&page=&limit=
 */
export async function fetchTicketMessages(params) {
  const { ticket_id, user_id, page = 1, limit = 20 } = params;
  const query = {
    ticket_id,
    user_id,
    page,
    limit,
  };
  const json = await getApi("support/admin/ticket-messages", query);
  const nested = flattenTicketMessagesList(json);
  const list = nested ?? extractArray(json);
  /** When the API omits total, `list.length` is not a reliable “grand total” — use explicitTotal === 0 to mean unknown. */
  const explicitTotal = pickTotal(json);
  const total = explicitTotal > 0 ? explicitTotal : list.length;

  const messages = list.map((m) => {
    const senderRaw =
      m.sender ??
      m.sender_type ??
      m.sent_by ??
      m.role ??
      m.from ??
      m.author_type ??
      m.user_type;
    const s = String(senderRaw || "").toLowerCase();
    const isAdmin =
      s === "admin" ||
      s === "support" ||
      s === "agent" ||
      s === "moderator" ||
      s === "staff" ||
      s === "super_admin" ||
      m.is_admin === true ||
      m.from_admin === true ||
      m.sender_is_admin === true ||
      m.is_from_admin === true;
    const text =
      m.text ??
      m.message ??
      m.body ??
      m.content ??
      m.msg ??
      m.message_text ??
      "";
    const ts = m.created_at ?? m.createdAt ?? m.time ?? m.timestamp ?? m.sent_at;
    let time = "—";
    let createdAtMs = 0;
    if (ts) {
      try {
        const d = new Date(ts);
        if (!Number.isNaN(d.getTime())) {
          createdAtMs = d.getTime();
          time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else {
          time = String(ts);
        }
      } catch {
        time = String(ts);
      }
    }
    const idStr = String(m.id ?? m.message_id ?? `${ticket_id}-${Math.random()}`);
    if (!createdAtMs) {
      const n = Number(m.id ?? m.message_id);
      createdAtMs = Number.isFinite(n) ? n : idStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    }
    return {
      id: idStr,
      sender: isAdmin ? "admin" : "user",
      text: String(text),
      time,
      createdAtMs,
      attachmentUrl: pickAttachmentUrl(m),
      _raw: m,
    };
  });

  return { messages, total, explicitTotal, raw: json };
}

/**
 * POST /support/admin/ticket-send-message
 */
export function sendTicketMessage(payload) {
  return postApi("support/admin/ticket-send-message", {
    ticket_id: payload.ticket_id,
    text: payload.text,
    attachment_url: payload.attachment_url ?? "",
  });
}

/**
 * PUT /support/ticket/update-status
 */
export function updateTicketStatus(payload) {
  return putApi("support/ticket/update-status", {
    ticket_id: payload.ticket_id,
    status: payload.status,
    resolution_note: payload.resolution_note ?? "",
    note: payload.note ?? "",
  });
}
