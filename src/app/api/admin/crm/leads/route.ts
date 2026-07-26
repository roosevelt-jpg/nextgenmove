import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";

const LEAD_COLLECTIONS = [
  "job_applications",
  "requests",
  "role_interest_submissions",
  "newsletter_subscribers",
] as const;

const deleteSchema = z.object({
  sourceCollection: z.enum(LEAD_COLLECTIONS),
  sourceId: z.string().min(1),
});

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = deleteSchema.parse(await request.json());
    const ref = adminDb
      .collection(body.sourceCollection)
      .doc(body.sourceId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await ref.delete();

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "crm_lead_deleted",
      targetType: body.sourceCollection,
      targetId: body.sourceId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("crm_lead_delete_failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
