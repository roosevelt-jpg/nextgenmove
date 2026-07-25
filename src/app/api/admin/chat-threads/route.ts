import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { stripUndefined } from "@/lib/stripUndefined";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  const snap = await adminDb
    .collection("chat_threads")
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();

  const items = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      visitorName: data.visitorName ?? null,
      visitorEmail: data.visitorEmail ?? null,
      status: data.status ?? "open",
      lastMessage: data.lastMessage ?? "",
      source: data.source ?? "public_widget",
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });

  return NextResponse.json({ items });
}

const replySchema = z.object({
  threadId: z.string().min(1),
  message: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = replySchema.parse(await request.json());
    const threadRef = adminDb.collection("chat_threads").doc(body.threadId);
    const snap = await threadRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await threadRef.collection("messages").add(
      stripUndefined({
        role: "admin",
        text: body.message,
        adminId: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    await threadRef.set(
      stripUndefined({
        lastMessage: body.message.slice(0, 240),
        status: "open",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("admin_chat_reply_failed", error);
    return NextResponse.json({ error: "reply_failed" }, { status: 500 });
  }
}
