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

function extractText(data: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}): string | null {
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

export async function generateGeminiReply(options: {
  system: string;
  userMessage: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
}): Promise<string> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const contents = [
    ...(options.history ?? []).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user" as const, parts: [{ text: options.userMessage }] },
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        "gemini_request_failed",
        model,
        response.status,
        body.slice(0, 400),
      );
      if (isQuotaExhausted(response.status, body)) {
        throw new Error("gemini_quota_exhausted");
      }
      if (isModelUnavailable(response.status, body)) {
        lastError = "gemini_model_unavailable";
        continue;
      }
      if (
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403
      ) {
        throw new Error("gemini_invalid_key");
      }
      throw new Error("gemini_request_failed");
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };

    const text = extractText(data);
    if (!text) {
      lastError = "gemini_empty_response";
      continue;
    }

    return text;
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
