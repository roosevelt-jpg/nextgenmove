import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  cancelBenchReservation,
  convertBenchReservation,
  expireStaleBenchHolds,
  listCompanyReservations,
  listReadyBenchStudents,
  reserveBenchSeat,
} from "@/lib/move-os/bench";
import { ensureMoveItinerary, listMovesForCompany } from "@/lib/move-os/itinerary";
import { listSprintsForCompany } from "@/lib/move-os/shadow-sprint";
import { evaluateArrivalSla } from "@/lib/move-os/arrival";
import { adminDb } from "@/lib/firebase-admin";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/employer/bench" }, async () => {
    const session = await getEmployerSession();
    if (!session) return unauthorizedResponse();

    void expireStaleBenchHolds(40);

    const [ready, reservations, moves, sprints] = await Promise.all([
      listReadyBenchStudents(50),
      listCompanyReservations(session.companyId),
      listMovesForCompany(session.companyId),
      listSprintsForCompany(session.companyId),
    ]);

    const bench = ready.map((student) => {
      const missingKinds = Array.isArray(student.missingKinds)
        ? student.missingKinds.map(String)
        : Array.isArray(student.readinessMissingKinds)
          ? student.readinessMissingKinds.map(String)
          : [];
      const verifiedKinds = Array.isArray(student.verifiedKinds)
        ? student.verifiedKinds.map(String)
        : [];
      return {
        id: String(student.id),
        dubaiReadyScore: Number(student.dubaiReadyScore ?? 0),
        benchStatus: String(student.benchStatus ?? "ready"),
        sector: String(student.sector ?? ""),
        seniority: String(student.seniority ?? ""),
        nationality: String(student.nationality ?? ""),
        currentCity: String(student.currentCity ?? ""),
        targetCities: Array.isArray(student.targetCities)
          ? student.targetCities.map(String)
          : [],
        skills: Array.isArray(student.skills)
          ? student.skills.map(String).slice(0, 8)
          : [],
        missingKinds,
        verifiedKinds,
        missingKindsCount: missingKinds.length,
      };
    });

    const companySnap = await adminDb
      .collection("companies")
      .doc(session.companyId)
      .get();
    const companyCredits = Number(companySnap.data()?.credits ?? 0);

    const sla = await Promise.all(
      moves.map(async (move) => {
        try {
          const result = await evaluateArrivalSla(move.id);
          return [move.id, result] as const;
        } catch {
          return [move.id, null] as const;
        }
      }),
    );

    return NextResponse.json({
      bench,
      reservations,
      moves,
      sprints,
      companyCredits,
      slaByMoveId: Object.fromEntries(sla),
    });
  });
}

const reserveSchema = z.object({
  action: z.literal("reserve").optional(),
  studentId: z.string().min(1),
  matchId: z.string().min(1).optional(),
});

const cancelSchema = z.object({
  action: z.literal("cancel_reservation"),
  reservationId: z.string().min(1),
});

const convertSchema = z.object({
  action: z.literal("convert_reservation"),
  reservationId: z.string().min(1),
});

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/employer/bench" }, async () => {
    const session = await getEmployerSession();
    if (!session) return unauthorizedResponse();
    const previewBlock = assertNotPreviewMode(session.mode);
    if (previewBlock) return previewBlock;

    try {
      const raw = (await request.json()) as Record<string, unknown>;
      if (raw.action === "cancel_reservation") {
        const body = cancelSchema.parse(raw);
        await cancelBenchReservation({
          reservationId: body.reservationId,
          companyId: session.companyId,
        });
        return NextResponse.json({ ok: true });
      }
      if (raw.action === "convert_reservation") {
        const body = convertSchema.parse(raw);
        const reservation = await convertBenchReservation({
          reservationId: body.reservationId,
          companyId: session.companyId,
        });
        return NextResponse.json({ ok: true, reservation });
      }

      const body = reserveSchema.parse(raw);
      let matchId = body.matchId ?? null;
      if (!matchId) {
        const matchRef = adminDb.collection("matches").doc();
        await matchRef.set({
          id: matchRef.id,
          studentId: body.studentId,
          companyId: session.companyId,
          source: "bench_reserve",
          stageId: "shortlist",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        matchId = matchRef.id;
      }

      const reservation = await reserveBenchSeat({
        companyId: session.companyId,
        studentId: body.studentId,
        matchId,
      });
      const move = await ensureMoveItinerary({
        matchId,
        studentId: body.studentId,
        companyId: session.companyId,
      });
      return NextResponse.json({ ok: true, reservation, move, matchId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      const message =
        error instanceof Error ? error.message : "bench_reserve_failed";
      const status =
        message === "student_not_bench_ready" || message === "reservation_not_held"
          ? 409
          : message === "forbidden"
            ? 403
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
