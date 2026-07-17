import type { Timestamp } from "firebase-admin/firestore";

type TimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
};

function isTimestampLike(value: unknown): value is TimestampLike {
  if (!value || typeof value !== "object") return false;
  const v = value as TimestampLike;
  return (
    typeof v.toDate === "function" ||
    typeof v.seconds === "number" ||
    typeof v._seconds === "number"
  );
}

export function serializeTimestamp(
  value: Timestamp | TimestampLike | string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }

  const raw = value as TimestampLike;
  const seconds =
    typeof raw.seconds === "number"
      ? raw.seconds
      : typeof raw._seconds === "number"
        ? raw._seconds
        : null;

  if (seconds != null) {
    const nanos =
      typeof raw.nanoseconds === "number"
        ? raw.nanoseconds
        : typeof raw._nanoseconds === "number"
          ? raw._nanoseconds
          : 0;
    return new Date(seconds * 1000 + nanos / 1e6).toISOString();
  }

  return null;
}

/**
 * Deep-convert Firestore Timestamps into JSON-safe values so Server Components
 * can pass CMS documents into Client Components.
 */
export function serializeForClient<T>(value: T): T {
  return serializeValue(value) as T;
}

function serializeValue(value: unknown): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (isTimestampLike(value)) {
    return serializeTimestamp(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = serializeValue(nested);
  }
  return output;
}

export function mapDocument<T extends { id: string }>(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined,
  mapper: (data: FirebaseFirestore.DocumentData, id: string) => T,
): T | null {
  if (!data) {
    return null;
  }

  return mapper(data, id);
}
