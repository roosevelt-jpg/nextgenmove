import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { z } from "zod";
import { stripUndefined } from "@/lib/stripUndefined";
import { revokeUserSessions } from "@/lib/security/session-revoke";
import { logger } from "@/lib/observability/logger";

function serializeDoc(id: string, data: FirebaseFirestore.DocumentData) {
  const output: Record<string, unknown> = { id: id === data.uid ? id : id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      output[key] = serializeTimestamp(value as FirebaseFirestore.Timestamp);
    } else {
      output[key] = value;
    }
  }

  output.uid = data.uid ?? id;
  return output;
}

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await adminDb.collection("users").get();
    const items = snapshot.docs.map((doc) => serializeDoc(doc.id, doc.data()));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

const patchSchema = z.object({
  userId: z.string(),
  action: z.enum(["promote_admin", "suspend", "activate"]),
});

export async function PATCH(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = patchSchema.parse(await request.json());
    const ref = adminDb.collection("users").doc(body.userId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (body.action === "promote_admin") {
      await ref.update(stripUndefined({ role: "admin" }));
    }

    if (body.action === "suspend") {
      await ref.update(stripUndefined({ status: "suspended" }));
      await revokeUserSessions(body.userId, "admin_suspend");
    }

    if (body.action === "activate") {
      await ref.update(stripUndefined({ status: "active" }));
    }

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: `user_${body.action}`,
      targetType: "users",
      targetId: body.userId,
    });

    const updated = await ref.get();

    return NextResponse.json({ item: serializeDoc(updated.id, updated.data()!) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    logger.error("users_patch_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
