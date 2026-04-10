/** Parse ₹ amounts: plain digits, commas, ₹, and Indian shorthand (spaces optional). */
export function parseIndianRupeeInput(raw) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  s = s.replace(/₹/g, "").replace(/,/g, "").trim();
  s = s.toLowerCase().replace(/\s+/g, " ");
  s = s.replace(/\bcrores?\b/g, "cr");
  s = s.replace(/\blakhs?\b/g, "lac");
  s = s.replace(/\blacs?\b/g, "lac");
  const compact = s.replace(/\s/g, "");
  if (!compact) return null;

  if (/^-?[\d.]+$/.test(compact)) {
    const n = Number(compact);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const unitMatch = compact.match(/^(-?[\d.]+)(cr|lac|l)$/);
  if (unitMatch) {
    const num = Number(unitMatch[1]);
    if (!Number.isFinite(num) || num < 0) return null;
    const mult = unitMatch[2] === "cr" ? 1e7 : 1e5;
    return Math.round(num * mult);
  }

  const kMatch = compact.match(/^(-?[\d.]+)k$/);
  if (kMatch) {
    const num = Number(kMatch[1]);
    return Number.isFinite(num) && num >= 0 ? Math.round(num * 1000) : null;
  }

  const digits = compact.replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const fallback = Number(digits);
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : null;
}
