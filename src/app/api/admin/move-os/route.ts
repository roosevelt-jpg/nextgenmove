import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";
import {
  setEvidenceStatus,
  listStudentEvidence,
  listSupersededByKind,
  recomputeAndPersistStudentReadiness,
} from "@/lib/move-os/evidence";
import { listMovesForStudent, updateMilestone } from "@/lib/move-os/itinerary";
import { getMoveOsLevers, DEFAULT_MOVE_OS_LEVERS } from "@/lib/move-os/config";
import { creditCompany, resolveDualCommit } from "@/lib/move-os/escrow";
import { expireStaleBenchHolds } from "@/lib/move-os/bench";
import { adminDb } from "@/lib/firebase-admin";
import { withRequestLog } from "@/lib/observability/api-handler";
import { EVIDENCE_KINDS } from "@/types/move-os";
import { stripUndefined } from "@/lib/stripUndefined";

export const dynamic = "force-dynamic";

/** Held reservations expiring within this window (hours). */
const HOLD_EXPIRING_SOON_HOURS = 24;

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/admin/move-os" }, async () => {
    const session = await getAdminSession();
    if (!session) return unauthorizedResponse();

    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");
    if (studentId) {
      const [evidence, moves, studentSnap, readiness] = await Promise.all([
        listStudentEvidence(studentId),
        listMovesForStudent(studentId),
        adminDb.collection("students").doc(studentId).get(),
        recomputeAndPersistStudentReadiness(studentId),
      ]);
      return NextResponse.json({
        student: studentSnap.exists
          ? { id: studentSnap.id, ...studentSnap.data() }
          : null,
        evidence,
        supersededByKind: listSupersededByKind(evidence),
        moves,
        evidenceKinds: EVIDENCE_KINDS,
        readiness: {
          score: readiness.score,
          verifiedKinds: readiness.verifiedKinds,
          missingKinds: readiness.missingKinds,
          benchStatus: readiness.benchStatus,
          maxScore: readiness.maxScore,
          updatedAt: readiness.updatedAt,
        },
      });
    }

    const soonIso = new Date(
      Date.now() + HOLD_EXPIRING_SOON_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const [
      pendingEvidence,
      readyBench,
      activeMoves,
      lockedEscrowsSnap,
      slaBreachedSnap,
      heldSnap,
      levers,
    ] = await Promise.all([
      adminDb
        .collection("evidence_items")
        .where("status", "==", "pending")
        .limit(40)
        .get(),
      adminDb
        .collection("students")
        .where("benchStatus", "==", "ready")
        .limit(40)
        .get(),
      adminDb
        .collection("move_itineraries")
        .where("status", "==", "active")
        .limit(40)
        .get(),
      adminDb
        .collection("credit_escrows")
        .where("status", "==", "locked")
        .limit(80)
        .get(),
      adminDb
        .collection("move_itineraries")
        .where("status", "==", "sla_breached")
        .limit(40)
        .get(),
      adminDb
        .collection("bench_reservations")
        .where("status", "==", "held")
        .limit(80)
        .get(),
      getMoveOsLevers(),
    ]);

    const heldReservations = heldSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((row) => {
        const expiresAt = String(
          (row as { expiresAt?: string }).expiresAt ?? "",
        );
        return Boolean(expiresAt) && expiresAt <= soonIso;
      })
      .sort((a, b) =>
        String((a as { expiresAt?: string }).expiresAt ?? "").localeCompare(
          String((b as { expiresAt?: string }).expiresAt ?? ""),
        ),
      );

    return NextResponse.json({
      pendingEvidence: pendingEvidence.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
      readyBench: readyBench.docs.map((d) => ({ id: d.id, ...d.data() })),
      activeMoves: activeMoves.docs.map((d) => ({ id: d.id, ...d.data() })),
      lockedEscrows: lockedEscrowsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
      slaBreachedMoves: slaBreachedSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
      heldReservations,
      levers,
    });
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify_evidence"),
    evidenceId: z.string().min(1),
    status: z.enum(["verified", "rejected"]),
    notes: z.string().max(500).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
  z.object({
    action: z.literal("milestone_update"),
    moveId: z.string().min(1),
    key: z.string().min(1),
    status: z
      .enum(["locked", "pending", "in_progress", "blocked", "done", "skipped"])
      .optional(),
    blocker: z.string().max(500).nullable().optional(),
  }),
  z.object({
    action: z.literal("grant_company_credits"),
    companyId: z.string().min(1),
    amount: z.number().int().positive().max(100_000),
  }),
  z.object({
    action: z.literal("update_levers"),
    levers: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("resolve_escrow"),
    matchId: z.string().min(1),
    outcome: z.enum([
      "release",
      "refund_both",
      "forfeit_student",
      "forfeit_company",
    ]),
  }),
  z.object({
    action: z.literal("expire_holds"),
  }),
]);

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/admin/move-os" }, async () => {
    const session = await getAdminSession();
    if (!session) return unauthorizedResponse();

    try {
      const body = actionSchema.parse(await request.json());
      if (body.action === "verify_evidence") {
        const item = await setEvidenceStatus({
          evidenceId: body.evidenceId,
          status: body.status,
          adminId: session.uid,
          notes: body.notes ?? null,
          expiresAt: body.expiresAt,
        });
        return NextResponse.json({ ok: true, item });
      }
      if (body.action === "milestone_update") {
        const move = await updateMilestone({
          moveId: body.moveId,
          key: body.key as never,
          status: body.status,
          blocker: body.blocker,
        });
        return NextResponse.json({ ok: true, move });
      }
      if (body.action === "grant_company_credits") {
        const result = await creditCompany({
          companyId: body.companyId,
          amount: body.amount,
          reason: "move_os_admin",
          actorUid: session.uid,
        });
        return NextResponse.json({ ok: true, credits: result.credits });
      }
      if (body.action === "update_levers") {
        const existing = await getMoveOsLevers();
        const next = {
          ...DEFAULT_MOVE_OS_LEVERS,
          ...existing,
          ...body.levers,
          evidenceKindWeights: {
            ...DEFAULT_MOVE_OS_LEVERS.evidenceKindWeights,
            ...existing.evidenceKindWeights,
            ...((body.levers.evidenceKindWeights as Record<string, number>) ??
              {}),
          },
        };
        await adminDb.collection("program_levers").doc("default").set(
          stripUndefined({
            moveOs: next,
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );
        return NextResponse.json({ ok: true, levers: next });
      }
      if (body.action === "resolve_escrow") {
        await resolveDualCommit({
          matchId: body.matchId,
          outcome: body.outcome,
        });
        return NextResponse.json({ ok: true });
      }
      if (body.action === "expire_holds") {
        const expired = await expireStaleBenchHolds(100);
        return NextResponse.json({ ok: true, expired });
      }
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "move_os_failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
