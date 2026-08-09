/**
 * Scheduled publish gate for CMS entities.
 *
 * `publishAt` is metadata for now (no cron flips status). Public loaders must
 * treat a document as live only when status is published AND
 * (no publishAt OR publishAt <= now).
 */

export function parsePublishAtMs(value: unknown): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate();
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Date-only (YYYY-MM-DD) → start of that UTC day
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const ms = Date.parse(`${raw}T00:00:00.000Z`);
    return Number.isFinite(ms) ? ms : null;
  }

  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function isPublishAtLive(
  publishAt: unknown,
  nowMs: number = Date.now(),
): boolean {
  const at = parsePublishAtMs(publishAt);
  if (at == null) return true;
  return at <= nowMs;
}

/** True when status is published and schedule allows public visibility. */
export function isPubliclyPublished(
  data: { status?: unknown; publishAt?: unknown },
  nowMs: number = Date.now(),
): boolean {
  if (String(data.status ?? "") !== "published") return false;
  return isPublishAtLive(data.publishAt, nowMs);
}

/** True when publishAt is set and still in the future. */
export function isFuturePublishAt(
  publishAt: unknown,
  nowMs: number = Date.now(),
): boolean {
  const at = parsePublishAtMs(publishAt);
  if (at == null) return false;
  return at > nowMs;
}
