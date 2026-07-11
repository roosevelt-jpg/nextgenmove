import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

export type CreditDirection = "earn" | "spend";

export interface CreditGrantOptions {
  studentId: string;
  amount: number;
  source: string;
  relatedContentId?: string | null;
  /** Skip if a transaction with this source already exists for the student */
  once?: boolean;
  db?: Firestore;
}

/**
 * Adjust student credit balance and append a credit_transactions ledger row.
 * All credit mutations should go through this helper.
 */
export async function applyCreditDelta(options: CreditGrantOptions): Promise<{
  applied: boolean;
  credits: number;
  reason?: string;
}> {
  const db = options.db ?? adminDb;
  const amount = Math.trunc(options.amount);

  if (!amount) {
    return { applied: false, credits: 0, reason: "zero_amount" };
  }

  const direction: CreditDirection = amount >= 0 ? "earn" : "spend";
  const absAmount = Math.abs(amount);

  return db.runTransaction(async (transaction) => {
    const studentRef = db.collection("students").doc(options.studentId);
    const studentSnap = await transaction.get(studentRef);

    if (!studentSnap.exists) {
      throw new Error("student_not_found");
    }

    if (options.once) {
      const existing = await transaction.get(
        db
          .collection("credit_transactions")
          .where("studentId", "==", options.studentId)
          .where("source", "==", options.source)
          .limit(1),
      );

      if (!existing.empty) {
        return {
          applied: false,
          credits: (studentSnap.data()?.credits as number | undefined) ?? 0,
          reason: "already_granted",
        };
      }
    }

    const current = (studentSnap.data()?.credits as number | undefined) ?? 0;
    const next = current + amount;

    if (next < 0) {
      throw new Error("insufficient_credits");
    }

    const txRef = db.collection("credit_transactions").doc();

    transaction.update(studentRef, stripUndefined({ credits: next }));
    transaction.set(
      txRef,
      stripUndefined({
        id: txRef.id,
        studentId: options.studentId,
        direction,
        source: options.source,
        amount: absAmount,
        relatedContentId: options.relatedContentId ?? null,
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    return { applied: true, credits: next };
  });
}

export async function getWayToEarnCredits(wayId: string): Promise<number> {
  const snap = await adminDb.collection("program_levers").doc("default").get();
  const ways = (snap.data()?.waysToEarn as Array<{ id?: string; credits?: number }> | undefined) ?? [];
  const way = ways.find((item) => item.id === wayId);
  return typeof way?.credits === "number" ? way.credits : 0;
}
