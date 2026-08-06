import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  generateGeminiReply,
  NGM_ASSISTANT_SYSTEM,
} from "@/lib/ai/gemini";
import { buildAssistantContext } from "@/lib/ai/assistant-context";

const schema = z.object({
  message: z.string().trim().min(1).max(4000),
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const context = await buildAssistantContext();
    const reply = await generateGeminiReply({
      system: `${NGM_ASSISTANT_SYSTEM}\nCaller role: ${user.role}.\n\n${context}`,
      userMessage: body.message,
      history: body.history,
    });
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "gemini_not_configured") {
      return NextResponse.json({ error: "gemini_not_configured" }, { status: 503 });
    }
    if (error instanceof Error && error.message === "gemini_invalid_key") {
      return NextResponse.json({ error: "gemini_invalid_key" }, { status: 503 });
    }
    if (error instanceof Error && error.message === "gemini_model_unavailable") {
      return NextResponse.json({ error: "gemini_model_unavailable" }, { status: 503 });
    }
    console.error("assistant_chat_failed", error);
    return NextResponse.json({ error: "assistant_failed" }, { status: 500 });
  }
}
