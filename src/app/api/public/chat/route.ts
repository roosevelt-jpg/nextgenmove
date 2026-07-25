import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  generateGeminiReply,
  PUBLIC_CHATBOT_SYSTEM,
} from "@/lib/ai/gemini";

const schema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: z.string().min(1).optional(),
  visitorName: z.string().trim().max(120).optional(),
  visitorEmail: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    let threadId = body.threadId;
    let threadRef = threadId
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
      reply = await generateGeminiReply({
        system: PUBLIC_CHATBOT_SYSTEM,
        userMessage: body.message,
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
