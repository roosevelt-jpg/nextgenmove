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
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";

export const dynamic = "force-dynamic";

const MAX_SPRINT_BYTES = 15 * 1024 * 1024;
const ALLOWED_SPRINT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "type" in value &&
    "size" in value &&
    typeof (value as File).arrayBuffer === "function"
  );
}

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
    phone: z.string().trim().max(24).optional().nullable(),
    whatsappOptIn: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("sprint_submit"),
    sprintId: z.string().min(1),
    deliverableUrl: z.string().url().optional(),
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
  z.object({
    action: z.literal("milestone_update"),
    moveId: z.string().min(1),
    key: z.enum(["housing", "flight", "bank", "emirates_id"]),
    status: z
      .enum(["locked", "pending", "in_progress", "blocked", "done", "skipped"])
      .default("done"),
  }),
]);

async function resolveSprintDeliverableUrl(input: {
  request: Request;
  sessionStudentId: string;
  contentType: string | null;
}): Promise<
  | { ok: true; sprintId: string; deliverableUrl: string }
  | { ok: false; response: NextResponse }
> {
  if (input.contentType?.includes("multipart/form-data")) {
    const form = await input.request.formData();
    const sprintId = String(form.get("sprintId") || "").trim();
    if (!sprintId) {
      return {
        ok: false,
        response: NextResponse.json({ error: "invalid_body" }, { status: 400 }),
      };
    }
    const urlHint = String(form.get("deliverableUrl") || "").trim();
    const file = form.get("file");
    if (isUploadFile(file)) {
      const contentType = String(file.type || "");
      if (!ALLOWED_SPRINT_TYPES.has(contentType)) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "invalid_file_type" },
            { status: 400 },
          ),
        };
      }
      if (file.size <= 0 || file.size > MAX_SPRINT_BYTES) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "invalid_file_size" },
            { status: 400 },
          ),
        };
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = sanitizeUploadFilename(
        String(file.name || "sprint-deliverable.pdf"),
      );
      const path = `students/${input.sessionStudentId}/sprint/${Date.now()}-${filename}`;
      const uploaded = await uploadFileViaAdmin({
        path,
        buffer,
        contentType,
        filename,
      });
      return { ok: true, sprintId, deliverableUrl: uploaded.url };
    }
    if (urlHint) {
      const parsed = z.string().url().safeParse(urlHint);
      if (!parsed.success) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "invalid_deliverable_url" },
            { status: 400 },
          ),
        };
      }
      return { ok: true, sprintId, deliverableUrl: parsed.data };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "deliverable_required" },
        { status: 400 },
      ),
    };
  }

  const body = actionSchema.parse(await input.request.json());
  if (body.action !== "sprint_submit") {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_action" }, { status: 400 }),
    };
  }
  if (!body.deliverableUrl) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "deliverable_required" },
        { status: 400 },
      ),
    };
  }
  return {
    ok: true,
    sprintId: body.sprintId,
    deliverableUrl: body.deliverableUrl,
  };
}

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/student/move" }, async () => {
    const session = await getStudentSession();
    if (!session) return unauthorizedResponse();
    const previewBlock = assertNotPreviewMode(session.mode);
    if (previewBlock) return previewBlock;

    try {
      const contentType = request.headers.get("content-type");
      const isSprintMultipart =
        contentType?.includes("multipart/form-data") === true;

      if (isSprintMultipart) {
        const resolved = await resolveSprintDeliverableUrl({
          request,
          sessionStudentId: session.studentId,
          contentType,
        });
        if (!resolved.ok) return resolved.response;
        const sprint = await submitShadowDeliverable({
          sprintId: resolved.sprintId,
          studentId: session.studentId,
          deliverableUrl: resolved.deliverableUrl,
        });
        return NextResponse.json({ ok: true, sprint });
      }

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
          request,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      if (body.action === "sponsor_invite") {
        const base = appBaseUrl(request);
        const { token } = await createSponsorLink({
          studentId: session.studentId,
          sponsorName: body.sponsorName,
          sponsorEmail: body.sponsorEmail,
          phone: body.phone ?? null,
          whatsappOptIn: body.whatsappOptIn ?? false,
          publicBaseUrl: base,
        });
        const url = `${base.replace(/\/$/, "")}/sponsor/${token}`;
        return NextResponse.json({ ok: true, url });
      }
      if (body.action === "sprint_submit") {
        if (!body.deliverableUrl) {
          return NextResponse.json(
            { error: "deliverable_required" },
            { status: 400 },
          );
        }
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
      if (body.action === "milestone_update") {
        const move = await getMoveById(body.moveId);
        if (!move || move.studentId !== session.studentId) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const updated = await updateMilestone({
          moveId: body.moveId,
          key: body.key,
          status: body.status,
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
