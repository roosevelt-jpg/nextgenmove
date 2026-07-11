import type { Timestamp } from "firebase-admin/firestore";

type TimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
};

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
