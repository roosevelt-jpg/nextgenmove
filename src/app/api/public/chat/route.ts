import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  generateGeminiReply,
  PUBLIC_CHATBOT_SYSTEM,
} from "@/lib/ai/gemini";
import { buildAssistantContext } from "@/lib/ai/assistant-context";
import { serializeTimestamp } from "@/lib/firestore-utils";

const schema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: z.string().min(1).optional(),
  visitorName: z.string().trim().max(120).optional(),
  visitorEmail: z.string().trim().email().optional().or(z.literal("")),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId")?.trim();
  if (!threadId) {
    return NextResponse.json({ error: "thread_required" }, { status: 400 });
  }

  try {
    const threadRef = adminDb.collection("chat_threads").doc(threadId);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists || threadSnap.data()?.source !== "public_widget") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const messagesSnap = await threadRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(100)
      .get();

    const messages = messagesSnap.docs.map((doc) => {
      const data = doc.data();
      const role = String(data.role ?? "assistant");
      return {
        id: doc.id,
        role,
        text: String(data.text ?? ""),
        createdAt: serializeTimestamp(data.createdAt),
      };
    });

    return NextResponse.json({ threadId, messages });
  } catch (error) {
    console.error("public_chat_thread_get_failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    let threadId = body.threadId;
    const threadRef = threadId
      ? adminDb.collection("chat_threads").doc(threadId)
      : adminDb.collection("chat_threads").doc();

    if (!threadId) {
      threadId = threadRef.id;
      await threadRef.set(
        stripUndefined({
          id: threadId,
          source: "public_widget",
          visitorName: body.visitorName || null,
          visitorEmail: body.visitorEmail || null,
          status: "open",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
    } else if (body.visitorName || body.visitorEmail) {
      await threadRef.set(
        stripUndefined({
          ...(body.visitorName ? { visitorName: body.visitorName } : {}),
          ...(body.visitorEmail ? { visitorEmail: body.visitorEmail } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    }

    const messagesRef = threadRef.collection("messages");
    await messagesRef.add(
      stripUndefined({
        role: "user",
        text: body.message,
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    let reply: string;
    try {
      const context = await buildAssistantContext();
      reply = await generateGeminiReply({
        system: `${PUBLIC_CHATBOT_SYSTEM}\n\n${context}`,
        userMessage: body.message,
        history: body.history,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "gemini_not_configured") {
        reply =
          "Thanks for reaching out. Our assistant is temporarily offline — please use the contact form and our team will reply soon.";
      } else {
        throw error;
      }
    }

    await messagesRef.add(
      stripUndefined({
        role: "assistant",
        text: reply,
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    await threadRef.set(
      stripUndefined({
        lastMessage: reply.slice(0, 240),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    return NextResponse.json({ threadId, reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("public_chat_failed", error);
    return NextResponse.json({ error: "chat_failed" }, { status: 500 });
  }
}
