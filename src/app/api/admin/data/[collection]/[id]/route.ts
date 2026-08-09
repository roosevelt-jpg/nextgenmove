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
import { sanitizePlainTextFields } from "@/lib/admin/sanitize-plain-text";
import { normalizeToE164 } from "@/lib/phone/e164";
import { isFuturePublishAt } from "@/lib/cms/publish-visibility";

const CMS_CONTENT_COLLECTIONS = new Set([
  "cms_pages",
  "testimonials",
  "talent_stories",
]);

function normalizePhoneFields(
  collection: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...data };
  const phoneKeys =
    collection === "companies"
      ? ["contactPhone", "phone"]
      : collection === "students" || collection === "leads"
        ? ["phone"]
        : ["phone", "contactPhone"];

  for (const key of phoneKeys) {
    if (typeof next[key] !== "string") continue;
    const normalized = normalizeToE164(next[key] as string);
    if (normalized) next[key] = normalized;
  }
  return next;
}

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

/**
 * Content OS: stamp updatedBy; when publishing, set publishedAt only if
 * publishAt is empty or already due. Future publishAt stays status=published
 * as schedule metadata — public loaders filter publishAt <= now.
 */
function applyCmsContentOsFields(
  collection: string,
  rest: Record<string, unknown>,
  existing: FirebaseFirestore.DocumentData | undefined,
  actorUid: string,
): Record<string, unknown> {
  if (!CMS_CONTENT_COLLECTIONS.has(collection)) {
    return rest;
  }

  const next: Record<string, unknown> = { ...rest, updatedBy: actorUid };
  const nextStatus = next.status ?? existing?.status;
  const publishAt =
    next.publishAt !== undefined ? next.publishAt : existing?.publishAt;
  const becomingPublished =
    nextStatus === "published" &&
    (next.status === "published" || existing?.status !== "published");

  if (becomingPublished) {
    if (isFuturePublishAt(publishAt)) {
      // Scheduled: keep status published as metadata; defer publishedAt stamp.
    } else if (!next.publishedAt && !existing?.publishedAt) {
      next.publishedAt = FieldValue.serverTimestamp();
    }
    if (collection === "testimonials" || collection === "talent_stories") {
      next.reviewedBy = actorUid;
    }
  }

  return next;
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
    const body = normalizePhoneFields(
      collection,
      sanitizePlainTextFields(
        (await request.json()) as Record<string, unknown>,
      ),
    );
    const ref = adminDb.collection(collection).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists && collection.startsWith("page_")) {
      const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = body;
      await ref.set({
        ...stripUndefined({ id, ...rest }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    } else {
      const { id: _id, updatedAt: _u, createdAt: _c, ...rawRest } = body;
      const rest = applyCmsContentOsFields(
        collection,
        rawRest,
        snapshot.data(),
        session.uid,
      );
      await ref.update({
        ...stripUndefined(rest),
        updatedAt: FieldValue.serverTimestamp(),
      });
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
