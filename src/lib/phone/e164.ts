/**
 * Normalize a phone string toward E.164 (+ and digits only).
 * Returns null when the value is empty or clearly not a phone number.
 */
export function normalizeToE164(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  let candidate = trimmed.replace(/[\s()-./]/g, "");
  if (candidate.startsWith("00")) {
    candidate = `+${candidate.slice(2)}`;
  }
  if (!candidate.startsWith("+")) {
    candidate = `+${candidate.replace(/^\+/, "")}`;
  }

  const digits = candidate.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }

  return `+${digits}`;
}
