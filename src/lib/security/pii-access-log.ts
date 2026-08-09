import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

export type PiiAccessAction =
  | "unlock_approve"
  | "unlock_view"
  | "profile_view_unlocked";

/**
 * Server-only audit trail for PII unlock / view events.
 * Clients must never read or write `pii_access_events` (see firestore.rules).
 */
export async function logPiiAccess(input: {
  actorUid: string;
  studentId: string;
  action: PiiAccessAction | string;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  const ref = adminDb.collection("pii_access_events").doc();
  await ref.set(
    stripUndefined({
      id: ref.id,
      actorUid: input.actorUid,
      studentId: input.studentId,
      action: input.action,
      meta: input.meta ?? null,
      createdAt: FieldValue.serverTimestamp(),
    }),
  );
}
