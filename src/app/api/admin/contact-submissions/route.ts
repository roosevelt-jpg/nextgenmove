import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { serializeForClient } from "@/lib/firestore-utils";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const snap = await adminDb
    .collection("contact_submissions")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const items = snap.docs.map((doc) =>
    serializeForClient({ id: doc.id, ...doc.data() }),
  );

  return NextResponse.json({ items });
}
