"use client";

import { getApi } from "@/api";

// Games list from custom-game/read-all. Analytics are fetched live from the
// tracking service via the /api/tracking/game-stats proxy (keeps the X-API-Key secret).

const extractGamesList = (json) => {
  if (Array.isArray(json)) return json;
  const data = json?.result?.data ?? json?.data ?? json?.result ?? json?.payload;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.games)) return data.games;
  }
  return [];
};

const normalizeGameRow = (row) => {
  const id = row?.id ?? row?.game_id;
  const name = String(row?.game_name ?? row?.name ?? "").trim();
  if (id === undefined || id === null || !name) return null;
  const scoreboardTypes = Array.isArray(row?.scoreboard_type)
    ? row.scoreboard_type.map((type) => String(type).trim()).filter(Boolean)
    : [];
  return {
    id,
    name,
    totalUsers: pickNum(row?.total_users, row?.totalUsers),
    countUserCustom: pickNum(row?.count_user_custom, row?.countUserCustom),
    scoreboardTypes,
  };
};

const pickNum = (...vals) => {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const formatDayLabel = (dateKey) => {
  if (!dateKey) return "—";
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTimeSlotLabel = (startHour, endHour) => {
  const end = endHour >= 24 ? 24 : endHour;
  return `${startHour}–${end}`;
};

const pad2 = (n) => String(n).padStart(2, "0");

const toDateTimeParam = (dateKey, hour) => `${dateKey}T${pad2(hour)}:00:00`;

const nextDateKey = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const buildSlotDatetimeRange = (dateKey, startHour, intervalHours) => {
  const from = toDateTimeParam(dateKey, startHour);
  const endHour = startHour + intervalHours;
  const to = endHour >= 24 ? `${nextDateKey(dateKey)}T00:00:00` : toDateTimeParam(dateKey, endHour);
  return { from, to };
};

const buildEmptyTimeSlots = (intervalHours) => {
  const slots = [];
  for (let startHour = 0; startHour < 24; startHour += intervalHours) {
    const endHour = startHour + intervalHours;
    slots.push({
      startHour,
      endHour,
      label: formatTimeSlotLabel(startHour, endHour),
      users: 0,
      plays: 0,
      durationMinutes: 0,
    });
  }
  return slots;
};

const fetchGameStatsPayload = async ({ gameName, from, to }) => {
  const params = new URLSearchParams({
    eventName: `GAME_PLAYED_${gameName}`,
    from,
    to,
  });

  const response = await fetch(`/api/tracking/game-stats?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Failed to load game analytics");
  }

  return payload;
};

/**
 * Returns the list of games used to populate the page dropdown.
 */
export const fetchGamesList = async ({ startDate, endDate } = {}) => {
  const response = await getApi("custom-game/read-all", {
    page: 1,
    limit: 100,
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    // is_featured: 1,
  });

  if (response?.status === 0) {
    const err = response?.message || response?.data?.error || "Failed to load games";
    throw new Error(typeof err === "string" ? err : "Failed to load games");
  }

  return extractGamesList(response).map(normalizeGameRow).filter(Boolean);
};

/**
 * Fetch play analytics for a single game over a date range.
 * @param {Object} params
 * @param {string} params.gameName - exact game name (used to build eventName)
 * @param {string} params.startDate - YYYY-MM-DD (inclusive)
 * @param {string} params.endDate   - YYYY-MM-DD (inclusive)
 */
export const fetchGameAnalytics = async ({ gameName, startDate, endDate }) => {
  if (!gameName) throw new Error("Game is required");

  const payload = await fetchGameStatsPayload({
    gameName,
    from: startDate,
    to: endDate,
  });

  const range = payload?.range && typeof payload.range === "object" ? payload.range : null;
  const rangeOverall =
    range?.overall && typeof range.overall === "object" ? range.overall : null;
  const allTimeOverall =
    payload?.overall && typeof payload.overall === "object" ? payload.overall : null;

  // New shape: range.days. Legacy shape: days at root.
  const days = Array.isArray(range?.days)
    ? range.days
    : Array.isArray(payload?.days)
      ? payload.days
      : [];

  const timeline = days.map((row) => {
    const date = String(row?.day ?? row?.date ?? "").trim();
    return {
      date,
      label: formatDayLabel(date),
      users: pickNum(row?.uniqueUsers, row?.users),
      plays: pickNum(row?.plays, row?.count),
      durationMinutes: pickNum(row?.totalDurationMinutes, row?.durationMinutes),
    };
  });

  // Cards use the selected date-range stats when present.
  const summary = rangeOverall || allTimeOverall || payload;

  return {
    gameName,
    uniqueUsers: pickNum(summary?.uniqueUsers, payload?.uniqueUsers),
    totalPlays: pickNum(summary?.totalPlays, payload?.totalPlays),
    totalDurationMinutes: pickNum(summary?.totalDurationMinutes, payload?.totalDurationMinutes),
    avgDurationMinutes: pickNum(summary?.avgDurationMinutes, payload?.avgDurationMinutes),
    allTime: allTimeOverall
      ? {
          uniqueUsers: pickNum(allTimeOverall.uniqueUsers),
          totalPlays: pickNum(allTimeOverall.totalPlays),
          totalDurationMinutes: pickNum(allTimeOverall.totalDurationMinutes),
          avgDurationMinutes: pickNum(allTimeOverall.avgDurationMinutes),
        }
      : null,
    timeline,
    raw: payload,
  };
};

/**
 * Fetch time-bucket analytics for a single day.
 * Each slot is fetched with datetime from/to (e.g. 2026-07-01T00:00:00 → 2026-07-01T02:00:00).
 * @param {Object} params
 * @param {string} params.gameName
 * @param {string} params.date - YYYY-MM-DD
 * @param {number} params.intervalHours - bucket size in hours (default 3)
 */
export const fetchGameTimeAnalytics = async ({ gameName, date, intervalHours = 3 }) => {
  if (!gameName) throw new Error("Game is required");
  if (!date) throw new Error("Date is required");

  const hours = Number(intervalHours);
  const safeInterval = Number.isFinite(hours) && hours > 0 ? hours : 3;
  const slotDefs = buildEmptyTimeSlots(safeInterval);

  const timeline = await Promise.all(
    slotDefs.map(async (slot) => {
      const { from, to } = buildSlotDatetimeRange(date, slot.startHour, safeInterval);
      const payload = await fetchGameStatsPayload({ gameName, from, to });
      const rangeOverall =
        payload?.range?.overall && typeof payload.range.overall === "object"
          ? payload.range.overall
          : payload?.overall && typeof payload.overall === "object"
            ? payload.overall
            : payload;

      return {
        ...slot,
        from,
        to,
        users: pickNum(rangeOverall?.uniqueUsers),
        plays: pickNum(rangeOverall?.totalPlays),
        durationMinutes: pickNum(rangeOverall?.totalDurationMinutes),
      };
    })
  );

  const totalPlays = timeline.reduce((sum, row) => sum + row.plays, 0);
  const totalDurationMinutes = timeline.reduce((sum, row) => sum + row.durationMinutes, 0);

  return {
    gameName,
    date,
    intervalHours: safeInterval,
    totalPlays,
    totalDurationMinutes,
    avgDurationMinutes: totalPlays > 0 ? totalDurationMinutes / totalPlays : 0,
    timeline,
  };
};


// "use client";

// const MOCK_GAMES = [
//   { id: 3, name: "2048 Merge" },
//   { id: 12, name: "Solitaire Royale" },
//   { id: 11, name: "Carrom Blitz" },
//   { id: 9, name: "Chess Mate" },
//   { id: 5, name: "AIRCRAFT CONTROL" },
//   { id: 10, name: "THRYL LUDO" },
//   { id: 6, name: "Snake Arena" },
//   { id: 7, name: "Space Trails" },
//   { id: 4, name: "Sport Quest" },
//   { id: 2, name: "Emoji Crush" },
//   { id: 1, name: "Bubble Shooter" },
// ];

// const pickNum = (...vals) => {
//   for (const v of vals) {
//     const n = Number(v);
//     if (Number.isFinite(n)) return n;
//   }
//   return 0;
// };

// const formatDayLabel = (dateKey) => {
//   if (!dateKey) return "—";
//   const d = new Date(`${dateKey}T00:00:00Z`);
//   if (Number.isNaN(d.getTime())) return dateKey;
//   return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
// };

// export const fetchGamesList = async () => MOCK_GAMES;

// export const fetchGameAnalytics = async ({ gameName, startDate, endDate }) => {
//   if (!gameName) throw new Error("Game is required");

//   const params = new URLSearchParams({
//     eventName: `GAME_PLAYED_${gameName}`,
//     from: startDate,
//     to: endDate,
//   });

//   const response = await fetch(`/api/tracking/game-stats?${params.toString()}`, {
//     method: "GET",
//     cache: "no-store",
//   });

//   let payload = null;
//   try {
//     payload = await response.json();
//   } catch {
//     payload = null;
//   }

//   if (!response.ok || payload?.ok === false) {
//     throw new Error(payload?.error || "Failed to load game analytics");
//   }

//   // payload.range exists  →  NEW shape
//   // payload.days exists   →  OLD shape
//   const isNewShape = Array.isArray(payload?.range?.days);

//   // Summary cards → range-scoped stats
//   const rangeOverall = isNewShape
//     ? payload.range.overall          // NEW: { totalPlays, uniqueUsers, ... }
//     : payload?.overall ?? payload;   // OLD: top-level overall or flat payload

//   // Chart → day-by-day rows
//   const days = isNewShape
//     ? payload.range.days ?? []       // NEW: range.days
//     : payload?.days ?? [];           // OLD: payload.days

//   const timeline = days.map((row) => {
//     const date = String(row?.day ?? row?.date ?? "").trim();
//     return {
//       date,
//       label:           formatDayLabel(date),
//       users:           pickNum(row?.uniqueUsers, row?.users),
//       plays:           pickNum(row?.plays,       row?.count),
//       durationMinutes: pickNum(row?.totalDurationMinutes, row?.durationMinutes),
//     };
//   });

//   return {
//     gameName,

//     // ↓ These four feed the summary cards
//     uniqueUsers:          pickNum(rangeOverall?.uniqueUsers,          payload?.uniqueUsers),
//     totalPlays:           pickNum(rangeOverall?.totalPlays,           payload?.totalPlays),
//     totalDurationMinutes: pickNum(rangeOverall?.totalDurationMinutes, payload?.totalDurationMinutes),
//     avgDurationMinutes:   pickNum(rangeOverall?.avgDurationMinutes,   payload?.avgDurationMinutes),

//     // ↓ All-time stats (only in new shape, null otherwise)
//     allTime: isNewShape
//       ? {
//           uniqueUsers:          pickNum(payload.overall?.uniqueUsers),
//           totalPlays:           pickNum(payload.overall?.totalPlays),
//           totalDurationMinutes: pickNum(payload.overall?.totalDurationMinutes),
//           avgDurationMinutes:   pickNum(payload.overall?.avgDurationMinutes),
//         }
//       : null,

//     timeline,
//     raw: payload,
//   };
// };
