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

export const fetchGamesList = async () => {
  return MOCK_GAMES;
};

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

  // ── Detect which shape the API returned ──────────────────────────────────
  //
  // NEW shape:  payload.range.overall  +  payload.range.days
  // OLD shape:  payload.overall (or flat payload)  +  payload.days

  const isNewShape = payload?.range && typeof payload.range === "object";

  // Stats for the selected date range (drives the 4 summary cards)
  const rangeOverall = isNewShape
    ? payload.range.overall                                         // ← NEW
    : payload?.overall && typeof payload.overall === "object"
      ? payload.overall                                            // ← OLD object
      : payload;                                                   // ← OLD flat

  // Day-by-day rows (drives the chart)
  const days = isNewShape
    ? Array.isArray(payload.range.days) ? payload.range.days : [] // ← NEW
    : Array.isArray(payload?.days) ? payload.days : [];           // ← OLD

  // All-time stats exposed by new shape (payload.overall)
  const allTimeOverall = isNewShape ? payload.overall : null;

  // ── Build timeline array ─────────────────────────────────────────────────
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

  // ── Return normalised object consumed by the page component ──────────────
  return {
    gameName,

    // Range-scoped values → summary cards
    uniqueUsers:          pickNum(rangeOverall?.uniqueUsers,          payload?.uniqueUsers),
    totalPlays:           pickNum(rangeOverall?.totalPlays,           payload?.totalPlays),
    totalDurationMinutes: pickNum(rangeOverall?.totalDurationMinutes, payload?.totalDurationMinutes),
    avgDurationMinutes:   pickNum(rangeOverall?.avgDurationMinutes,   payload?.avgDurationMinutes),

    // All-time values (null when old shape)
    allTime: allTimeOverall
      ? {
          uniqueUsers:          pickNum(allTimeOverall.uniqueUsers),
          totalPlays:           pickNum(allTimeOverall.totalPlays),
          totalDurationMinutes: pickNum(allTimeOverall.totalDurationMinutes),
          avgDurationMinutes:   pickNum(allTimeOverall.avgDurationMinutes),
        }
      : null,

    timeline,
    raw: payload,
  };
};
