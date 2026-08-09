import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  generateGeminiReply,
  generateGeminiReplyWithTools,
  NGM_ASSISTANT_SYSTEM,
} from "@/lib/ai/gemini";
import { buildAssistantContext } from "@/lib/ai/assistant-context";
import {
  ASSISTANT_TOOL_DECLARATIONS,
  canUseAssistantTools,
  executeAssistantTool,
  runToolsFromIntentKeywords,
} from "@/lib/ai/assistant-tools";

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
    const toolsEnabled = canUseAssistantTools(user.role);

    let toolContext = "";
    if (toolsEnabled) {
      try {
        toolContext = (await runToolsFromIntentKeywords(body.message)) ?? "";
      } catch (error) {
        console.error("assistant_tool_intent_failed", error);
      }
    }

    const system = [
      NGM_ASSISTANT_SYSTEM,
      `Caller role: ${user.role}.`,
      toolsEnabled
        ? "Admin tools are available. Use them for live ops queues; never invent queue counts."
        : "No admin tools. Do not claim access to internal queues.",
      context,
      toolContext,
    ]
      .filter(Boolean)
      .join("\n\n");

    const reply = toolsEnabled
      ? await generateGeminiReplyWithTools({
          system,
          userMessage: body.message,
          history: body.history,
          tools: ASSISTANT_TOOL_DECLARATIONS,
          executeTool: executeAssistantTool,
        })
      : await generateGeminiReply({
          system,
          userMessage: body.message,
          history: body.history,
        });

    return NextResponse.json({ reply, toolsEnabled });
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
    if (error instanceof Error && error.message === "gemini_quota_exhausted") {
      return NextResponse.json({ error: "gemini_quota_exhausted" }, { status: 503 });
    }
    if (error instanceof Error && error.message === "gemini_empty_response") {
      return NextResponse.json({ error: "gemini_empty_response" }, { status: 503 });
    }
    console.error("assistant_chat_failed", error);
    return NextResponse.json({ error: "assistant_failed" }, { status: 500 });
  }
}
