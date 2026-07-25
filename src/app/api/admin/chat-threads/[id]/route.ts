import { NextResponse } from "next/server";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  const { id } = await params;
  const threadSnap = await adminDb.collection("chat_threads").doc(id).get();
  if (!threadSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const messagesSnap = await adminDb
    .collection("chat_threads")
    .doc(id)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  const data = threadSnap.data()!;
  return NextResponse.json({
    thread: {
      id,
      visitorName: data.visitorName ?? null,
      visitorEmail: data.visitorEmail ?? null,
      status: data.status ?? "open",
    },
    messages: messagesSnap.docs.map((doc) => {
      const m = doc.data();
      return {
        id: doc.id,
        role: m.role ?? "user",
        text: m.text ?? "",
        createdAt: m.createdAt?.toDate?.()?.toISOString?.() ?? null,
      };
    }),
  });
}
