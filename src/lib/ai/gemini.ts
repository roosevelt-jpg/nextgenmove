import {
  getIntegrationSecrets,
  isIntegrationConnected,
  isIntegrationAdminDisabled,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Prefer env override, then current Flash models available on the key.
 * gemini-2.0-flash was shut down for many projects — keep later as fallback only.
 */
const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash",
].filter((value): value is string => Boolean(value));

export async function getGeminiApiKey(): Promise<string | null> {
  // Respect explicit admin disconnect even if secrets remain in the store.
  try {
    const snap = await adminDb.collection("integrations").doc("gemini").get();
    if (snap.exists && isIntegrationAdminDisabled(snap.data())) {
      return null;
    }
  } catch {
    // continue — secrets/env may still work
  }

  const secrets = await getIntegrationSecrets("gemini");
  const key = (
    secrets.apiKey ||
    secrets.API_KEY ||
    secrets.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();
  if (!key) return null;

  // Prefer any usable key when connected OR when secrets/env satisfy gemini.
  if (await isIntegrationConnected("gemini")) {
    return key;
  }
  return process.env.GEMINI_API_KEY?.trim() || key || null;
}

function isModelUnavailable(status: number, body: string): boolean {
  if (status === 404) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("is not found") ||
    lower.includes("no longer available") ||
    lower.includes("deprecated")
  );
}

function isQuotaExhausted(status: number, body: string): boolean {
  if (status === 429) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("prepayment credits are depleted") ||
    lower.includes("billing") ||
    lower.includes("rate limit")
  );
}

type GeminiPart = {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
};

type GeminiContent = { role: string; parts: GeminiPart[] };

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

function extractText(data: GeminiGenerateResponse): string | null {
  if (data.promptFeedback?.blockReason) {
    return null;
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return text || null;
}

function extractFunctionCalls(
  data: GeminiGenerateResponse,
): Array<{ name: string; args: Record<string, unknown> }> {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  for (const part of parts) {
    const name = part.functionCall?.name?.trim();
    if (!name) continue;
    calls.push({
      name,
      args:
        part.functionCall?.args && typeof part.functionCall.args === "object"
          ? part.functionCall.args
          : {},
    });
  }
  return calls;
}

async function postGeminiGenerateContent(options: {
  apiKey: string;
  model: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: true; data: GeminiGenerateResponse } | { ok: false; status: number; body: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { ok: false, status: response.status, body };
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  return { ok: true, data };
}

function throwMappedGeminiHttpError(status: number, body: string): never {
  console.error("gemini_request_failed", status, body.slice(0, 400));
  if (isQuotaExhausted(status, body)) {
    throw new Error("gemini_quota_exhausted");
  }
  if (status === 400 || status === 401 || status === 403) {
    throw new Error("gemini_invalid_key");
  }
  throw new Error("gemini_request_failed");
}

export async function generateGeminiReply(options: {
  system: string;
  userMessage: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
}): Promise<string> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const contents: GeminiContent[] = [
    ...(options.history ?? []).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: options.userMessage }] },
  ];

  const payload = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };

  let lastError = "gemini_request_failed";

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const result = await postGeminiGenerateContent({
      apiKey,
      model,
      payload,
    });

    if (!result.ok) {
      if (isQuotaExhausted(result.status, result.body)) {
        throw new Error("gemini_quota_exhausted");
      }
      if (isModelUnavailable(result.status, result.body)) {
        lastError = "gemini_model_unavailable";
        console.error(
          "gemini_request_failed",
          model,
          result.status,
          result.body.slice(0, 400),
        );
        continue;
      }
      throwMappedGeminiHttpError(result.status, result.body);
    }

    const text = extractText(result.data);
    if (!text) {
      lastError = "gemini_empty_response";
      continue;
    }

    return text;
  }

  throw new Error(lastError);
}

export type GeminiToolDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/**
 * Admin tool loop: call Gemini with functionDeclarations, execute allowed tools
 * server-side, send functionResponse parts back until a final text reply.
 */
export async function generateGeminiReplyWithTools(options: {
  system: string;
  userMessage: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  tools: readonly GeminiToolDeclaration[];
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<string>;
  maxRounds?: number;
}): Promise<string> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const allowed = new Set(options.tools.map((t) => t.name));
  const contents: GeminiContent[] = [
    ...(options.history ?? []).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: options.userMessage }] },
  ];

  const basePayload = {
    systemInstruction: { parts: [{ text: options.system }] },
    tools: [
      {
        functionDeclarations: options.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ],
    toolConfig: {
      functionCallingConfig: { mode: "AUTO" },
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1536,
    },
  };

  const maxRounds = Math.max(1, Math.min(options.maxRounds ?? 4, 6));
  let lastError = "gemini_request_failed";

  for (let round = 0; round < maxRounds; round += 1) {
    let roundData: GeminiGenerateResponse | null = null;

    for (const model of GEMINI_MODEL_CANDIDATES) {
      const result = await postGeminiGenerateContent({
        apiKey,
        model,
        payload: { ...basePayload, contents },
      });

      if (!result.ok) {
        if (isQuotaExhausted(result.status, result.body)) {
          throw new Error("gemini_quota_exhausted");
        }
        if (isModelUnavailable(result.status, result.body)) {
          lastError = "gemini_model_unavailable";
          console.error(
            "gemini_request_failed",
            model,
            result.status,
            result.body.slice(0, 400),
          );
          continue;
        }
        // Some models reject tools — fall back to plain reply on first round.
        if (round === 0 && contents.length <= (options.history?.length ?? 0) + 1) {
          console.error(
            "gemini_tools_unavailable",
            model,
            result.status,
            result.body.slice(0, 300),
          );
          return generateGeminiReply({
            system: options.system,
            userMessage: options.userMessage,
            history: options.history,
          });
        }
        throwMappedGeminiHttpError(result.status, result.body);
      }

      roundData = result.data;
      break;
    }

    if (!roundData) {
      throw new Error(lastError);
    }

    const calls = extractFunctionCalls(roundData);
    if (calls.length) {
      const modelParts =
        roundData.candidates?.[0]?.content?.parts ??
        calls.map((c) => ({
          functionCall: { name: c.name, args: c.args },
        }));
      contents.push({ role: "model", parts: modelParts });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        if (!allowed.has(call.name)) {
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: { error: "tool_not_allowed" },
            },
          });
          continue;
        }
        try {
          const resultText = await options.executeTool(call.name, call.args);
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(resultText) as Record<string, unknown>;
          } catch {
            parsed = { result: resultText };
          }
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: parsed,
            },
          });
        } catch (error) {
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: {
                error: error instanceof Error ? error.message : "tool_failed",
              },
            },
          });
        }
      }
      contents.push({ role: "user", parts: responseParts });
      continue;
    }

    const text = extractText(roundData);
    if (text) return text;
    lastError = "gemini_empty_response";
    break;
  }

  throw new Error(lastError);
}

export const NGM_ASSISTANT_SYSTEM = `You are NGM Assistant for Nextgenmove, a talent relocation and placement platform.
Answer clearly and helpfully about FAQs, timelines, tracks (Track A / Track B), credits, and how matching works.
You may share aggregate, non-confidential insights (skills or nationalities in demand) when relevant.
Never invent specific company names, deal terms, salaries, contact details, or student identities.
If asked for confidential or personal data, refuse and suggest contacting Nextgenmove staff.
Keep answers concise.`;

export const PUBLIC_CHATBOT_SYSTEM = `You are the Nextgenmove public website assistant.
Help visitors understand the platform, tracks, and how to sign up.
Do not share confidential company, student, or deal information.
If unsure, invite them to use the contact form or sign up.
Keep answers short and welcoming.`;
