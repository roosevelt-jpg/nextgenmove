import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getSessionActor } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

/**
 * Admin APIs always resolve the real signed-in admin (actor), never an
 * impersonation subject overlay.
 */
export async function getAdminSession() {
  const user = await getSessionActor();

  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function logActivity(input: {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  const ref = adminDb.collection("activity_log").doc();

  await ref.set(
    stripUndefined({
      id: ref.id,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    }),
  );
}
