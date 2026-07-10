import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { isAdminCollection } from "@/lib/admin/entity-schemas";
import { revalidateAdminCollection } from "@/lib/admin/revalidate";
import { stripUndefined } from "@/lib/stripUndefined";

function serializeDoc(id: string, data: FirebaseFirestore.DocumentData) {
  const output: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      output[key] = serializeTimestamp(value as FirebaseFirestore.Timestamp);
    } else {
      output[key] = value;
    }
  }

  return output;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { collection, id } = await context.params;

  if (!isAdminCollection(collection)) {
    return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
  }

  const snapshot = await adminDb.collection(collection).doc(id).get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ item: serializeDoc(snapshot.id, snapshot.data()!) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { collection, id } = await context.params;

  if (!isAdminCollection(collection)) {
    return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ref = adminDb.collection(collection).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists && collection.startsWith("page_")) {
      await ref.set(
        stripUndefined({
          id,
          ...body,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
    } else if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    } else {
      await ref.update(
        stripUndefined({
          ...body,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
    }

    revalidateAdminCollection(collection);

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "entity_updated",
      targetType: collection,
      targetId: id,
    });

    const updated = await ref.get();

    return NextResponse.json({ item: serializeDoc(updated.id, updated.data()!) });
  } catch (error) {
    console.error("admin_data_patch_failed", collection, id, error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { collection, id } = await context.params;

  if (!isAdminCollection(collection)) {
    return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
  }

  if (collection.startsWith("page_")) {
    return NextResponse.json({ error: "cannot_delete_singleton" }, { status: 400 });
  }

  try {
    await adminDb.collection(collection).doc(id).delete();
    revalidateAdminCollection(collection);

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "entity_deleted",
      targetType: collection,
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin_data_delete_failed", collection, id, error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
