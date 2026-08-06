import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";

/**
 * Prefer env override, then current Flash models.
 * gemini-2.0-flash was shut down 2026-06-01 — do not use it.
 */
const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
].filter((value): value is string => Boolean(value));

export async function getGeminiApiKey(): Promise<string | null> {
  const secrets = await getIntegrationSecrets("gemini");
  const key = (
    secrets.apiKey ||
    secrets.API_KEY ||
    secrets.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();
  if (!key) return null;

  // Honor explicit admin disconnect; otherwise any stored/env key is usable.
  if (!(await isIntegrationConnected("gemini"))) {
    return process.env.GEMINI_API_KEY?.trim() || null;
  }
  return key;
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
      if (isModelUnavailable(response.status, body)) {
        lastError = "gemini_model_unavailable";
        continue;
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error("gemini_invalid_key");
      }
      throw new Error("gemini_request_failed");
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("gemini_empty_response");
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
