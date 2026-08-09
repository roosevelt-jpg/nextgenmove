import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta } from "@/lib/credits/ledger";
import { stripUndefined } from "@/lib/stripUndefined";
import type { CreditEscrow, EscrowParty } from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { updateMilestone } from "./itinerary";

export async function applyCompanyCreditDelta(input: {
  companyId: string;
  amount: number;
  source: string;
  matchId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<{ credits: number }> {
  const amount = Math.trunc(input.amount);
  return adminDb.runTransaction(async (tx) => {
    const ref = adminDb.collection("companies").doc(input.companyId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("company_not_found");
    const current = Number(snap.data()?.credits ?? 0);
    const next = current + amount;
    if (next < 0) throw new Error("insufficient_company_credits");
    const ledgerRef = adminDb.collection("company_credit_transactions").doc();
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
    return { credits: next };
  });
}

/** Admin / ops top-up for employer dual-commit stakes. */
export async function creditCompany(input: {
  companyId: string;
  amount: number;
  reason: string;
  actorUid: string;
  meta?: Record<string, unknown>;
}): Promise<{ credits: number }> {
  if (input.amount <= 0) throw new Error("invalid_amount");
  return applyCompanyCreditDelta({
    companyId: input.companyId,
    amount: Math.trunc(input.amount),
    source: `admin_grant:${input.reason}`,
    meta: { ...(input.meta ?? {}), actorUid: input.actorUid },
  });
}

export async function lockDualCommit(input: {
  matchId: string;
  moveId: string;
  studentId: string;
  companyId: string;
}): Promise<{ studentEscrow: CreditEscrow; companyEscrow: CreditEscrow }> {
  const levers = await getMoveOsLevers();
  const existing = await adminDb
    .collection("credit_escrows")
    .where("matchId", "==", input.matchId)
    .where("status", "==", "locked")
    .limit(2)
    .get();
  if (!existing.empty) throw new Error("dual_commit_already_locked");

  await applyCreditDelta({
    studentId: input.studentId,
    amount: -Math.abs(levers.dualCommitStudentCredits),
    source: `dual_commit_lock:${input.matchId}`,
    once: true,
  });
  await applyCompanyCreditDelta({
    companyId: input.companyId,
    amount: -Math.abs(levers.dualCommitCompanyCredits),
    source: `dual_commit_lock:${input.matchId}`,
    matchId: input.matchId,
  });

  const makeEscrow = async (party: EscrowParty, partyId: string, amount: number) => {
    const ref = adminDb.collection("credit_escrows").doc();
    const doc = stripUndefined({
      id: ref.id,
      matchId: input.matchId,
      moveId: input.moveId,
      party,
      partyId,
      amount,
      status: "locked" as const,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    });
    await ref.set({
      ...doc,
      createdAt: FieldValue.serverTimestamp(),
    });
    return doc as CreditEscrow;
  };

  const studentEscrow = await makeEscrow(
    "student",
    input.studentId,
    levers.dualCommitStudentCredits,
  );
  const companyEscrow = await makeEscrow(
    "company",
    input.companyId,
    levers.dualCommitCompanyCredits,
  );

  await updateMilestone({
    moveId: input.moveId,
    key: "dual_commit",
    status: "done",
  });

  return { studentEscrow, companyEscrow };
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
