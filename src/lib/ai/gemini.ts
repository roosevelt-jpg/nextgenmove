import { getIntegrationSecrets } from "@/lib/admin/integration-secrets";

const GEMINI_MODEL = "gemini-2.0-flash";

export async function getGeminiApiKey(): Promise<string | null> {
  const secrets = await getIntegrationSecrets("gemini");
  const key =
    secrets.apiKey ||
    secrets.API_KEY ||
    secrets.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  return key.trim() || null;
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("gemini_request_failed", response.status, body.slice(0, 400));
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
