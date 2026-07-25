import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import {
  approveProfileUnlock,
  declineProfileUnlock,
} from "@/lib/employer/profile-unlock";

const patchSchema = z.object({
  action: z.enum(["approve", "decline"]),
  note: z.string().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());

    if (body.action === "approve") {
      const result = await approveProfileUnlock({
        requestId: id,
        adminUid: session.uid,
        note: body.note,
        httpRequest: request,
      });

      await logActivity({
        actorId: session.uid,
        actorRole: session.role,
        action: "profile_unlock_approved",
        targetType: "requests",
        targetId: id,
        metadata: {
          companyId: result.companyId,
          studentId: result.studentId,
          matchId: result.matchId,
        },
      });

      return NextResponse.json({ ok: true, ...result });
    }

    await declineProfileUnlock({
      requestId: id,
      adminUid: session.uid,
      note: body.note,
    });

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "profile_unlock_declined",
      targetType: "requests",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "not_found") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (error.message === "not_pending") {
        return NextResponse.json({ error: "not_pending" }, { status: 409 });
      }
      if (error.message === "invalid_type" || error.message === "invalid_request") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("admin_unlock_request_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
