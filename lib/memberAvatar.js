/**
 * Safe src for member avatars (API / CDN). Returns null if unusable.
 * Avoids passing bad strings into next/image (throws "Failed to construct 'URL'").
 */
export function normalizeMemberAvatarSrc(src) {
  if (src == null) return null;
  const s = String(src).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined") return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/\//.test(s)) return `https:${s}`;
  if (s.startsWith("/")) return s;
  try {
    return new URL(s).href;
  } catch {
    return null;
  }
}
