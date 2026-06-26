"use client";

// Game list is still static (no list endpoint wired yet). Names/ids come from
// the custom-games API response. Analytics are fetched live from the tracking
// service via the /api/tracking/game-stats proxy (keeps the X-API-Key secret).
//
// To wire the games list later, replace fetchGamesList with a getApi() call.

const MOCK_GAMES = [
  { id: 3, name: "2048 Merge" },
  { id: 12, name: "Solitaire Royale" },
  { id: 11, name: "Carrom Blitz" },
  { id: 9, name: "Chess Mate" },
  { id: 5, name: "AIRCRAFT CONTROL" },
  // { id: 3, name: "2048 Merge" },
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

/**
 * Returns the list of games used to populate the page dropdown.
 */
export const fetchGamesList = async () => {
  return MOCK_GAMES;
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
