import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import {
  getSingletonDocId,
  isSingletonCollection,
  revalidateAdminCollection,
} from "@/lib/admin/revalidate";
import { isAdminCollection } from "@/lib/admin/entity-schemas";
import { stripUndefined } from "@/lib/stripUndefined";
import { sanitizePlainTextFields } from "@/lib/admin/sanitize-plain-text";

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
  context: { params: Promise<{ collection: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { collection } = await context.params;

  if (!isAdminCollection(collection)) {
    return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
  }

  try {
    if (isSingletonCollection(collection)) {
      const docId = getSingletonDocId(collection);
      const snapshot = await adminDb.collection(collection).doc(docId).get();

      if (!snapshot.exists) {
        return NextResponse.json({ item: null });
      }

      return NextResponse.json({ item: serializeDoc(snapshot.id, snapshot.data()!) });
    }

    const snapshot = await adminDb.collection(collection).get();
    const items = snapshot.docs.map((doc) => serializeDoc(doc.id, doc.data()));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("admin_data_list_failed", collection, error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { collection } = await context.params;

  if (!isAdminCollection(collection)) {
    return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
  }

  if (isSingletonCollection(collection)) {
    return NextResponse.json({ error: "singleton_use_patch" }, { status: 400 });
  }

  try {
    const body = sanitizePlainTextFields(
      (await request.json()) as Record<string, unknown>,
    );
    const ref = adminDb.collection(collection).doc();

    const { id: _bodyId, createdAt: _c, updatedAt: _u, ...rest } = body;
    await ref.set({
      ...stripUndefined({
        id: ref.id,
        ...rest,
      }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidateAdminCollection(collection);

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "entity_created",
      targetType: collection,
      targetId: ref.id,
    });

    const snapshot = await ref.get();

    return NextResponse.json({ item: serializeDoc(ref.id, snapshot.data()!) });
  } catch (error) {
    console.error("admin_data_create_failed", collection, error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
