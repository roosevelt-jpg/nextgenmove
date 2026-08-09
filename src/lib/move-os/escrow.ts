import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { CreditEscrow, EscrowParty } from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { updateMilestone } from "./itinerary";
import { notifyMoveOsParty, resolveUserEmail } from "./notify";

export async function applyCompanyCreditDelta(input: {
  companyId: string;
  amount: number;
  source: string;
  matchId?: string | null;
  meta?: Record<string, unknown>;
  /** Skip if a ledger row with this id or source already exists. */
  once?: boolean;
  ledgerId?: string;
}): Promise<{ credits: number; applied: boolean }> {
  const amount = Math.trunc(input.amount);
  return adminDb.runTransaction(async (tx) => {
    const ref = adminDb.collection("companies").doc(input.companyId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("company_not_found");

    const ledgerRef = input.ledgerId
      ? adminDb.collection("company_credit_transactions").doc(input.ledgerId)
      : adminDb.collection("company_credit_transactions").doc();

    if (input.once) {
      if (input.ledgerId) {
        const existingById = await tx.get(ledgerRef);
        if (existingById.exists) {
          return {
            credits: Number(snap.data()?.credits ?? 0),
            applied: false,
          };
        }
      } else {
        const existing = await tx.get(
          adminDb
            .collection("company_credit_transactions")
            .where("companyId", "==", input.companyId)
            .where("source", "==", input.source)
            .limit(1),
        );
        if (!existing.empty) {
          return {
            credits: Number(snap.data()?.credits ?? 0),
            applied: false,
          };
        }
      }
    }

    const current = Number(snap.data()?.credits ?? 0);
    const next = current + amount;
    if (next < 0) throw new Error("insufficient_company_credits");

    tx.set(
      ref,
      stripUndefined({ credits: next, updatedAt: FieldValue.serverTimestamp() }),
      { merge: true },
    );
    tx.set(
      ledgerRef,
      stripUndefined({
        id: ledgerRef.id,
        companyId: input.companyId,
        direction: amount >= 0 ? "earn" : "spend",
        source: input.source,
        amount: Math.abs(amount),
        matchId: input.matchId ?? null,
        meta: input.meta ?? null,
        createdAt: FieldValue.serverTimestamp(),
      }),
    );
    return { credits: next, applied: true };
  });
}

/** Admin / ops top-up for employer dual-commit stakes. */
export async function creditCompany(input: {
  companyId: string;
  amount: number;
  reason: string;
  actorUid: string;
  meta?: Record<string, unknown>;
  insurance?: boolean;
  source?: string;
  once?: boolean;
  ledgerId?: string;
}): Promise<{ credits: number; applied: boolean }> {
  if (input.amount <= 0) throw new Error("invalid_amount");
  return applyCompanyCreditDelta({
    companyId: input.companyId,
    amount: Math.trunc(input.amount),
    source: input.source ?? `admin_grant:${input.reason}`,
    meta: { ...(input.meta ?? {}), actorUid: input.actorUid },
    once: input.once,
    ledgerId: input.ledgerId,
  });
}

/**
 * Atomic dual-commit: student + company debit + both escrow docs in one transaction.
 * Uses deterministic doc IDs so the transaction never needs collection queries.
 */
export async function lockDualCommit(input: {
  matchId: string;
  moveId: string;
  studentId: string;
  companyId: string;
  insurance?: boolean;
  /** Optional request for auto top-up checkout URL generation. */
  request?: Request;
}): Promise<{ studentEscrow: CreditEscrow; companyEscrow: CreditEscrow }> {
  const levers = await getMoveOsLevers();
  const studentAmount = Math.abs(levers.dualCommitStudentCredits);
  const companyBase = Math.abs(levers.dualCommitCompanyCredits);
  const insuranceExtra = input.insurance
    ? Math.abs(levers.dualCommitInsuranceCredits)
    : 0;
  const companyAmount = companyBase + insuranceExtra;
  const source = `dual_commit_lock:${input.matchId}`;
  const studentEscrowId = `${input.matchId}_student`;
  const companyEscrowId = `${input.matchId}_company`;
  const studentTxId = `dual_commit_${input.matchId}_${input.studentId}`;
  const companyTxId = `dual_commit_${input.matchId}_${input.companyId}`;

  const result = await adminDb.runTransaction(async (tx) => {
    const studentEscrowRef = adminDb.collection("credit_escrows").doc(studentEscrowId);
    const companyEscrowRef = adminDb.collection("credit_escrows").doc(companyEscrowId);
    const studentRef = adminDb.collection("students").doc(input.studentId);
    const companyRef = adminDb.collection("companies").doc(input.companyId);
    const studentTxRef = adminDb.collection("credit_transactions").doc(studentTxId);
    const companyTxRef = adminDb
      .collection("company_credit_transactions")
      .doc(companyTxId);

    const [
      studentEscrowSnap,
      companyEscrowSnap,
      studentSnap,
      companySnap,
      studentTxSnap,
    ] = await Promise.all([
      tx.get(studentEscrowRef),
      tx.get(companyEscrowRef),
      tx.get(studentRef),
      tx.get(companyRef),
      tx.get(studentTxRef),
    ]);

    if (
      (studentEscrowSnap.exists &&
        String(studentEscrowSnap.data()?.status) === "locked") ||
      (companyEscrowSnap.exists &&
        String(companyEscrowSnap.data()?.status) === "locked") ||
      studentTxSnap.exists
    ) {
      throw new Error("dual_commit_already_locked");
    }
    if (!studentSnap.exists) throw new Error("student_not_found");
    if (!companySnap.exists) throw new Error("company_not_found");

    const studentCredits = Number(studentSnap.data()?.credits ?? 0);
    const companyCredits = Number(companySnap.data()?.credits ?? 0);
    if (studentCredits < studentAmount) throw new Error("insufficient_credits");
    if (companyCredits < companyAmount) {
      throw new Error("insufficient_company_credits");
    }

    const nowIso = new Date().toISOString();
    tx.update(studentRef, {
      credits: studentCredits - studentAmount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      studentTxRef,
      stripUndefined({
        id: studentTxId,
        studentId: input.studentId,
        direction: "spend",
        source,
        amount: studentAmount,
        relatedContentId: input.matchId,
        createdAt: FieldValue.serverTimestamp(),
      }),
    );
    tx.set(
      companyRef,
      stripUndefined({
        credits: companyCredits - companyAmount,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    tx.set(
      companyTxRef,
      stripUndefined({
        id: companyTxId,
        companyId: input.companyId,
        direction: "spend",
        source,
        amount: companyAmount,
        matchId: input.matchId,
        meta: { insurance: Boolean(input.insurance) },
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    const studentEscrow = stripUndefined({
      id: studentEscrowId,
      matchId: input.matchId,
      moveId: input.moveId,
      party: "student" as const,
      partyId: input.studentId,
      amount: studentAmount,
      status: "locked" as const,
      insurance: false,
      createdAt: nowIso,
      resolvedAt: null,
    });
    const companyEscrow = stripUndefined({
      id: companyEscrowId,
      matchId: input.matchId,
      moveId: input.moveId,
      party: "company" as const,
      partyId: input.companyId,
      amount: companyAmount,
      status: "locked" as const,
      insurance: Boolean(input.insurance),
      createdAt: nowIso,
      resolvedAt: null,
    });

    tx.set(studentEscrowRef, {
      ...studentEscrow,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(companyEscrowRef, {
      ...companyEscrow,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      studentEscrow: studentEscrow as CreditEscrow,
      companyEscrow: companyEscrow as CreditEscrow,
    };
  });

  await updateMilestone({
    moveId: input.moveId,
    key: "dual_commit",
    status: "done",
  });

  void (async () => {
    const emailTo = await resolveUserEmail(input.studentId);
    await notifyMoveOsParty({
      userId: input.studentId,
      kind: "dual_commit_locked",
      body: "Your dual-commit stake is locked for this move.",
      link: "/student/move",
      emailTo,
    });
  })();
  void (async () => {
    const emailTo = await resolveUserEmail(input.companyId);
    await notifyMoveOsParty({
      userId: input.companyId,
      kind: "dual_commit_locked",
      body: "Company dual-commit stake is locked for this move.",
      link: "/employer/bench",
      emailTo,
    });
  })();

  try {
    const { maybeCompanyAutoTopUp } = await import("./company-auto-topup");
    void maybeCompanyAutoTopUp({
      companyId: input.companyId,
      request: input.request,
    });
  } catch (error) {
    console.error("company_auto_topup_failed", error);
  }

  return result;
}

export async function resolveDualCommit(input: {
  matchId: string;
  outcome: "release" | "forfeit_student" | "forfeit_company" | "refund_both";
}): Promise<void> {
  const snap = await adminDb
    .collection("credit_escrows")
    .where("matchId", "==", input.matchId)
    .where("status", "==", "locked")
    .get();
  if (snap.empty) return;

  for (const doc of snap.docs) {
    const escrow = doc.data() as CreditEscrow;
    let status: CreditEscrow["status"] = "released";
    if (input.outcome === "refund_both") {
      status = "refunded";
      if (escrow.party === "student") {
        const { applyCreditDelta } = await import("@/lib/credits/ledger");
        await applyCreditDelta({
          studentId: escrow.partyId,
          amount: escrow.amount,
          source: `dual_commit_refund:${input.matchId}`,
        });
      } else {
        await applyCompanyCreditDelta({
          companyId: escrow.partyId,
          amount: escrow.amount,
          source: `dual_commit_refund:${input.matchId}`,
          matchId: input.matchId,
        });
      }
    } else if (
      (input.outcome === "forfeit_student" && escrow.party === "student") ||
      (input.outcome === "forfeit_company" && escrow.party === "company")
    ) {
      status = "forfeited";
    } else if (input.outcome === "release") {
      status = "released";
      if (escrow.party === "student") {
        const { applyCreditDelta } = await import("@/lib/credits/ledger");
        await applyCreditDelta({
          studentId: escrow.partyId,
          amount: escrow.amount,
          source: `dual_commit_release:${input.matchId}`,
        });
      } else {
        await applyCompanyCreditDelta({
          companyId: escrow.partyId,
          amount: escrow.amount,
          source: `dual_commit_release:${input.matchId}`,
          matchId: input.matchId,
        });
      }
    }

    await doc.ref.set(
      stripUndefined({
        status,
        resolvedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  }
}
