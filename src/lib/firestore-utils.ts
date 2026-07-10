import type { Timestamp } from "firebase-admin/firestore";

export function serializeTimestamp(
  value: Timestamp | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return value.toDate().toISOString();
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
