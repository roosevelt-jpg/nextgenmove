/**
 * Resolve CMS label text. Empty strings from Firestore must not blank out buttons —
 * `??` only falls back for null/undefined, so prefer this helper for UI copy.
 */
export function labelText(
  labels: Record<string, string | undefined> | null | undefined,
  key: string,
  fallback: string,
): string {
  const value = labels?.[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}
