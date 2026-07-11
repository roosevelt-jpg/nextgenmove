import type { Timestamp } from "firebase-admin/firestore";

export function serializeTimestamp(
  value:
    | Timestamp
    | { toDate?: () => Date; seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number }
    | string
    | null
    | undefined,
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

  const seconds =
    typeof value.seconds === "number"
      ? value.seconds
      : typeof value._seconds === "number"
        ? value._seconds
        : null;

  if (seconds != null) {
    const nanos =
      typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : typeof value._nanoseconds === "number"
          ? value._nanoseconds
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
