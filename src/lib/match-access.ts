import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

function matchAccessDocId(companyId: string, studentId: string) {
  return `${companyId}_${studentId}`;
}

export async function upsertMatchAccess(companyId: string, studentId: string) {
  await adminDb
    .collection("match_access")
    .doc(matchAccessDocId(companyId, studentId))
    .set(
      stripUndefined({
        companyId,
        studentId,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
}

export async function removeMatchAccess(companyId: string, studentId: string) {
  await adminDb
    .collection("match_access")
    .doc(matchAccessDocId(companyId, studentId))
    .delete()
    .catch(() => null);
}
