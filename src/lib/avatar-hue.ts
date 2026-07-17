/**
 * Brand Guidelines §05 — initials avatars rotate through four core hues by name hash.
 */

export const AVATAR_HUES = [
  { bg: "var(--bg-purple)", fg: "var(--fill-accent)" }, // purple
  { bg: "var(--bg-accent)", fg: "var(--text-accent)" }, // amber
  { bg: "var(--bg-success)", fg: "var(--text-success)" }, // green
  { bg: "var(--bg-warning)", fg: "var(--text-warning)" }, // oxblood
] as const;

export function hashName(name: string): number {
  let hash = 0;
  const s = name.trim().toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function avatarHueForName(name: string): (typeof AVATAR_HUES)[number] {
  return AVATAR_HUES[hashName(name) % AVATAR_HUES.length]!;
}

export function initialsFromName(name: string, fallback = "?"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** Tailwind-friendly class pair for common avatar chips. */
export function avatarToneClasses(name: string): string {
  const index = hashName(name) % 4;
  switch (index) {
    case 1:
      return "bg-bg-accent text-text-accent";
    case 2:
      return "bg-bg-success text-text-success";
    case 3:
      return "bg-bg-warning text-text-warning";
    default:
      return "bg-bg-purple text-fill-accent";
  }
}
