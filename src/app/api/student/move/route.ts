import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getMoveById,
  listMovesForStudent,
  updateMilestone,
} from "@/lib/move-os/itinerary";
import { createSponsorLink } from "@/lib/move-os/sponsor";
import {
  listSprintsForStudent,
  rateShadowSprint,
  submitShadowDeliverable,
} from "@/lib/move-os/shadow-sprint";
import { lockDualCommit } from "@/lib/move-os/escrow";
import { evaluateArrivalSla } from "@/lib/move-os/arrival";
import { appBaseUrl } from "@/lib/billing/stripe";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/student/move" }, async () => {
    const session = await getStudentSession();
    if (!session) return unauthorizedResponse();
    const [moves, sprints] = await Promise.all([
      listMovesForStudent(session.studentId),
      listSprintsForStudent(session.studentId),
    ]);
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
      moves,
      sprints,
      slaByMoveId: Object.fromEntries(sla),
    });
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("dual_commit"),
    moveId: z.string().min(1),
    matchId: z.string().min(1),
  }),
  z.object({
    action: z.literal("sponsor_invite"),
    sponsorName: z.string().trim().min(1).max(120),
    sponsorEmail: z.string().email(),
  }),
  z.object({
    action: z.literal("sprint_submit"),
    sprintId: z.string().min(1),
    deliverableUrl: z.string().url(),
  }),
  z.object({
    action: z.literal("sprint_rate"),
    sprintId: z.string().min(1),
    rating: z.number().min(1).max(5),
    go: z.boolean(),
  }),
  z.object({
    action: z.literal("milestone_note"),
    moveId: z.string().min(1),
    key: z.string().min(1),
    blocker: z.string().max(500).nullable().optional(),
  }),
]);

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/student/move" }, async () => {
    const session = await getStudentSession();
    if (!session) return unauthorizedResponse();
    const previewBlock = assertNotPreviewMode(session.mode);
    if (previewBlock) return previewBlock;

    try {
      const body = actionSchema.parse(await request.json());
      if (body.action === "dual_commit") {
        const move = await getMoveById(body.moveId);
        if (
          !move ||
          move.studentId !== session.studentId ||
          move.matchId !== body.matchId
        ) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const result = await lockDualCommit({
          matchId: body.matchId,
          moveId: body.moveId,
          studentId: session.studentId,
          companyId: move.companyId,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      if (body.action === "sponsor_invite") {
        const { token } = await createSponsorLink({
          studentId: session.studentId,
          sponsorName: body.sponsorName,
          sponsorEmail: body.sponsorEmail,
        });
        const url = `${appBaseUrl(request)}/sponsor/${token}`;
        return NextResponse.json({ ok: true, url });
      }
      if (body.action === "sprint_submit") {
        const sprint = await submitShadowDeliverable({
          sprintId: body.sprintId,
          studentId: session.studentId,
          deliverableUrl: body.deliverableUrl,
        });
        return NextResponse.json({ ok: true, sprint });
      }
      if (body.action === "sprint_rate") {
        const sprint = await rateShadowSprint({
          sprintId: body.sprintId,
          actor: "student",
          actorId: session.studentId,
          rating: body.rating,
          go: body.go,
        });
        return NextResponse.json({ ok: true, sprint });
      }
      if (body.action === "milestone_note") {
        const move = await getMoveById(body.moveId);
        if (!move || move.studentId !== session.studentId) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const updated = await updateMilestone({
          moveId: body.moveId,
          key: body.key as never,
          blocker: body.blocker ?? null,
        });
        return NextResponse.json({ ok: true, move: updated });
      }
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "move_failed";
      const status =
        message === "insufficient_credits" ||
        message === "insufficient_company_credits"
          ? 402
          : message === "dual_commit_already_locked"
            ? 409
            : message === "forbidden"
              ? 403
              : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
