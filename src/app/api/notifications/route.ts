import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { stripUndefined } from "@/lib/stripUndefined";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snap = await adminDb
    .collection("notifications")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(30)
    .get()
    .catch(async () => {
      // Fallback without orderBy if index missing
      return adminDb
        .collection("notifications")
        .where("userId", "==", user.uid)
        .limit(30)
        .get();
    });

  const items = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: String(data.type ?? ""),
        title: String(data.title ?? ""),
        body: String(data.body ?? ""),
        link: data.link ? String(data.link) : null,
        read: Boolean(data.read),
        createdAt: serializeTimestamp(data.createdAt),
      };
    })
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  const unreadCount = items.filter((item) => !item.read).length;

  return NextResponse.json({ items, unreadCount });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    markAllRead?: boolean;
    id?: string;
  };

  if (body.markAllRead) {
    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", user.uid)
      .where("read", "==", false)
      .limit(50)
      .get();
    const batch = adminDb.batch();
    for (const doc of snap.docs) {
      batch.update(
        doc.ref,
        stripUndefined({
          read: true,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    const ref = adminDb.collection("notifications").doc(body.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== user.uid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await ref.update(
      stripUndefined({
        read: true,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_request" }, { status: 400 });
}
