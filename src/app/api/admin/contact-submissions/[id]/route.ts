import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { serializeForClient } from "@/lib/firestore-utils";
import { stripUndefined } from "@/lib/stripUndefined";

const patchSchema = z.object({
  status: z.enum(["new", "read", "replied", "archived"]).optional(),
  replyNotes: z.string().trim().max(4000).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const snap = await adminDb.collection("contact_submissions").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    item: serializeForClient({ id: snap.id, ...snap.data() }),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const ref = adminDb.collection("contact_submissions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    await ref.update(
      stripUndefined({
        ...body,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "contact_submission_update",
      targetType: "contact_submissions",
      targetId: id,
      metadata: stripUndefined({ status: body.status ?? null }),
    });

    const next = await ref.get();
    return NextResponse.json({
      item: serializeForClient({ id: next.id, ...next.data() }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
