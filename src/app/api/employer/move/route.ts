import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getMoveById,
  listMovesForCompany,
  updateMilestone,
} from "@/lib/move-os/itinerary";
import { lockDualCommit } from "@/lib/move-os/escrow";
import {
  createShadowSprint,
  listSprintsForCompany,
  rateShadowSprint,
} from "@/lib/move-os/shadow-sprint";
import { evaluateArrivalSla, recordArrivalEvent } from "@/lib/move-os/arrival";
import { getMoveOsLevers } from "@/lib/move-os/config";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/employer/move" }, async () => {
    const session = await getEmployerSession();
    if (!session) return unauthorizedResponse();
    const [moves, sprints, levers] = await Promise.all([
      listMovesForCompany(session.companyId),
      listSprintsForCompany(session.companyId),
      getMoveOsLevers(),
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
      shadowSprintTemplates: levers.shadowSprintTemplates,
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
    action: z.literal("start_shadow_sprint"),
    moveId: z.string().min(1),
    matchId: z.string().min(1),
    templateId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    brief: z.string().trim().min(1).max(4000).optional(),
  }),
  z.object({
    action: z.literal("sprint_rate"),
    sprintId: z.string().min(1),
    rating: z.number().min(1).max(5),
    go: z.boolean(),
  }),
  z.object({
    action: z.literal("arrival_event"),
    moveId: z.string().min(1),
    kind: z.enum([
      "landed",
      "housing_checkin",
      "day_one",
      "sla_miss",
      "sla_met",
    ]),
    note: z.string().max(500).nullable().optional(),
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
]);

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/employer/move" }, async () => {
    const session = await getEmployerSession();
    if (!session) return unauthorizedResponse();
    const previewBlock = assertNotPreviewMode(session.mode);
    if (previewBlock) return previewBlock;

    try {
      const body = actionSchema.parse(await request.json());
      if (body.action === "dual_commit") {
        const move = await getMoveById(body.moveId);
        if (
          !move ||
          move.companyId !== session.companyId ||
          move.matchId !== body.matchId
        ) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const result = await lockDualCommit({
          matchId: body.matchId,
          moveId: body.moveId,
          studentId: move.studentId,
          companyId: session.companyId,
          request,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      if (body.action === "start_shadow_sprint") {
        const move = await getMoveById(body.moveId);
        if (
          !move ||
          move.companyId !== session.companyId ||
          move.matchId !== body.matchId
        ) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const levers = await getMoveOsLevers();
        const template = body.templateId
          ? levers.shadowSprintTemplates.find((t) => t.id === body.templateId)
          : null;
        const title =
          body.title?.trim() ||
          template?.title ||
          "Pre-flight shadow sprint";
        const brief =
          body.brief?.trim() ||
          template?.brief ||
          "Complete a 5-day micro-project in our real workflow before travel.";
        const sprint = await createShadowSprint({
          matchId: body.matchId,
          moveId: body.moveId,
          studentId: move.studentId,
          companyId: session.companyId,
          title,
          brief,
          templateId: body.templateId ?? template?.id ?? null,
          rubric: template?.rubric,
        });
        return NextResponse.json({ ok: true, sprint });
      }
      if (body.action === "sprint_rate") {
        const sprint = await rateShadowSprint({
          sprintId: body.sprintId,
          actor: "company",
          actorId: session.companyId,
          rating: body.rating,
          go: body.go,
        });
        return NextResponse.json({ ok: true, sprint });
      }
      if (body.action === "arrival_event") {
        const move = await getMoveById(body.moveId);
        if (!move || move.companyId !== session.companyId) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const event = await recordArrivalEvent({
          moveId: body.moveId,
          kind: body.kind,
          notedBy: session.companyId,
          note: body.note ?? null,
        });
        return NextResponse.json({ ok: true, event });
      }
      if (body.action === "milestone_update") {
        const move = await getMoveById(body.moveId);
        if (!move || move.companyId !== session.companyId) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const updated = await updateMilestone({
          moveId: body.moveId,
          key: body.key as never,
          status: body.status,
          blocker: body.blocker,
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
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
