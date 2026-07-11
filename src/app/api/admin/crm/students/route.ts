import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";

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

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const [snapshot, usersSnap] = await Promise.all([
      adminDb.collection("students").get(),
      adminDb.collection("users").get(),
    ]);
    const phoneByUser = new Map<string, string>();
    for (const doc of usersSnap.docs) {
      const phone = String(doc.data().phone ?? "").trim();
      if (phone) phoneByUser.set(doc.id, phone);
    }

    const items = snapshot.docs.map((doc) => {
      const item = serializeDoc(doc.id, doc.data());
      const userId = String(item.userId ?? doc.id);
      if (!item.phone) item.phone = phoneByUser.get(userId) ?? "";
      item.dateJoined = item.createdAt ?? null;
      return item;
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
