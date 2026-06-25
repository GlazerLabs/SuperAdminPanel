// "use client";

// // Game list is still static (no list endpoint wired yet). Names/ids come from
// // the custom-games API response. Analytics are fetched live from the tracking
// // service via the /api/tracking/game-stats proxy (keeps the X-API-Key secret).
// //
// // To wire the games list later, replace fetchGamesList with a getApi() call.

// const MOCK_GAMES = [
//   { id: 3, name: "2048 Merge" },
//   { id: 12, name: "Solitaire Royale" },
//   { id: 11, name: "Carrom Blitz" },
//   { id: 9, name: "Chess Mate" },
//   { id: 5, name: "AIRCRAFT CONTROL" },
//   // { id: 3, name: "2048 Merge" },
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

// /**
//  * Returns the list of games used to populate the page dropdown.
//  */
// export const fetchGamesList = async () => {
//   return MOCK_GAMES;
// };

// /**
//  * Fetch play analytics for a single game over a date range.
//  * @param {Object} params
//  * @param {string} params.gameName - exact game name (used to build eventName)
//  * @param {string} params.startDate - YYYY-MM-DD (inclusive)
//  * @param {string} params.endDate   - YYYY-MM-DD (inclusive)
//  */
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

//   const overall = payload?.overall && typeof payload.overall === "object" ? payload.overall : payload;
//   const days = Array.isArray(payload?.days) ? payload.days : [];

//   const timeline = days.map((row) => {
//     const date = String(row?.day ?? row?.date ?? "").trim();
//     return {
//       date,
//       label: formatDayLabel(date),
//       users: pickNum(row?.uniqueUsers, row?.users),
//       plays: pickNum(row?.plays, row?.count),
//       durationMinutes: pickNum(row?.totalDurationMinutes, row?.durationMinutes),
//     };
//   });

//   return {
//     gameName,
//     uniqueUsers: pickNum(payload?.uniqueUsers, overall?.uniqueUsers),
//     totalPlays: pickNum(payload?.totalPlays, overall?.totalPlays),
//     totalDurationMinutes: pickNum(payload?.totalDurationMinutes, overall?.totalDurationMinutes),
//     avgDurationMinutes: pickNum(payload?.avgDurationMinutes, overall?.avgDurationMinutes),
//     timeline,
//     raw: payload,
//   };
// };


"use client";

const MOCK_GAMES = [
  { id: 3, name: "2048 Merge" },
  { id: 12, name: "Solitaire Royale" },
  { id: 11, name: "Carrom Blitz" },
  { id: 9, name: "Chess Mate" },
  { id: 5, name: "AIRCRAFT CONTROL" },
  { id: 10, name: "THRYL LUDO" },
  { id: 6, name: "Snake Arena" },
  { id: 7, name: "Space Trails" },
  { id: 4, name: "Sport Quest" },
  { id: 2, name: "Emoji Crush" },
  { id: 1, name: "Bubble Shooter" },
];

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

export const fetchGamesList = async () => MOCK_GAMES;

export const fetchGameAnalytics = async ({ gameName, startDate, endDate }) => {
  if (!gameName) throw new Error("Game is required");

  const params = new URLSearchParams({
    eventName: `GAME_PLAYED_${gameName}`,
    from: startDate,
    to: endDate,
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

  // payload.range exists  →  NEW shape
  // payload.days exists   →  OLD shape
  const isNewShape = payload?.range && typeof payload.range === "object";

  // Summary cards → range-scoped stats
  const rangeOverall = isNewShape
    ? payload.range.overall          // NEW: { totalPlays, uniqueUsers, ... }
    : payload?.overall ?? payload;   // OLD: top-level overall or flat payload

  // Chart → day-by-day rows
  const days = isNewShape
    ? payload.range.days ?? []       // NEW: range.days
    : payload?.days ?? [];           // OLD: payload.days

  const timeline = days.map((row) => {
    const date = String(row?.day ?? row?.date ?? "").trim();
    return {
      date,
      label:           formatDayLabel(date),
      users:           pickNum(row?.uniqueUsers, row?.users),
      plays:           pickNum(row?.plays,       row?.count),
      durationMinutes: pickNum(row?.totalDurationMinutes, row?.durationMinutes),
    };
  });

  return {
    gameName,

    // ↓ These four feed the summary cards
    uniqueUsers:          pickNum(rangeOverall?.uniqueUsers,          payload?.uniqueUsers),
    totalPlays:           pickNum(rangeOverall?.totalPlays,           payload?.totalPlays),
    totalDurationMinutes: pickNum(rangeOverall?.totalDurationMinutes, payload?.totalDurationMinutes),
    avgDurationMinutes:   pickNum(rangeOverall?.avgDurationMinutes,   payload?.avgDurationMinutes),

    // ↓ All-time stats (only in new shape, null otherwise)
    allTime: isNewShape
      ? {
          uniqueUsers:          pickNum(payload.overall?.uniqueUsers),
          totalPlays:           pickNum(payload.overall?.totalPlays),
          totalDurationMinutes: pickNum(payload.overall?.totalDurationMinutes),
          avgDurationMinutes:   pickNum(payload.overall?.avgDurationMinutes),
        }
      : null,

    timeline,
    raw: payload,
  };
};
