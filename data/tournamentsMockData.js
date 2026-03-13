function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function iso(d) {
  return new Date(d).toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatRange(startIso, endIso) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const startLabel = `${pad2(s.getDate())} ${s.toLocaleString("en-US", { month: "short" })}`;
  const endLabel = `${pad2(e.getDate())} ${e.toLocaleString("en-US", { month: "short" })} ${e.getFullYear()}`;
  return sameMonth ? `${startLabel} - ${pad2(e.getDate())} ${e.toLocaleString("en-US", { month: "short" })} ${e.getFullYear()}` : `${startLabel} - ${endLabel}`;
}

const GAMES = ["Free Fire Max", "BGMI", "Valorant", "CODM", "Clash Royale"];
const ORGS = ["Glazer Games", "Apex Arena", "Nova Esports Hub", "Zenith Tournaments", "Rapid Rivals"];
const TITLES = [
  "Daily Play & Win Scrims",
  "Weekend Knockout Cup",
  "Pro League Qualifiers",
  "Community Clash Series",
  "Midnight Mayhem",
  "Elite Duo Showdown",
  "Squad Royale Finals",
];

function makeHierarchy(seed) {
  const userLabel = `User ${seed}`;
  const organizerCount = seed % 2 === 0 ? 2 : 3;
  const organizers = Array.from({ length: organizerCount }).map((_, oi) => {
    const orgName = oi === 0 ? "abc" : oi === 1 ? "xyz" : "pqr";
    const teamMemberCount = oi === 0 ? 3 : oi === 1 ? 2 : 2;
    const teamMembers = Array.from({ length: teamMemberCount }).map((__, mi) => {
      const memberLabel = oi === 0 ? ["j", "k", "l"][mi] : oi === 1 ? ["b", "c"][mi] : ["m", "n"][mi];
      const freelancerCount = memberLabel === "j" ? 1 : memberLabel === "m" ? 2 : 0;
      const freelancers = Array.from({ length: freelancerCount }).map((___, fi) => ({
        id: `f-${seed}-${oi}-${mi}-${fi}`,
        type: "freelancer",
        label: fi === 0 ? "o" : `o${fi + 1}`,
        meta: { role: "Freelancer" },
        children: [],
      }));

      return {
        id: `tm-${seed}-${oi}-${mi}`,
        type: "team_member",
        label: memberLabel.toUpperCase(),
        meta: { role: "Team member" },
        children: freelancers,
      };
    });

    return {
      id: `org-${seed}-${oi}`,
      type: "organizer",
      label: `Organizer ${orgName.toUpperCase()}`,
      meta: { handle: orgName },
      children: teamMembers,
    };
  });

  return {
    id: `u-${seed}`,
    type: "user",
    label: userLabel,
    meta: { action: "Organized this tournament" },
    children: organizers,
  };
}

export const tournamentsMock = Array.from({ length: 28 }).map((_, i) => {
  const id = String(i + 1);
  const game = GAMES[i % GAMES.length];
  const organizerName = ORGS[i % ORGS.length];
  const title = `${TITLES[i % TITLES.length]} D${(i % 7) + 1}`;
  const start = addDays(new Date("2026-03-10T06:02:00.000Z"), i % 6);
  const end = addDays(start, 0);
  const startAt = iso(start);
  const endAt = iso(end);
  const status = i % 5 === 0 ? "Finished" : i % 3 === 0 ? "Live" : "Upcoming";
  const entryFee = i % 4 === 0 ? "Free" : `₹${(i % 6) * 10 + 10}`;
  const slots = 40 + (i % 6) * 10;

  return {
    id,
    organizerName,
    status,
    title,
    game,
    entryFee,
    slots,
    startAt,
    endAt,
    dateLabel: formatRange(startAt, endAt),
    hierarchy: makeHierarchy(i + 1),
  };
});

