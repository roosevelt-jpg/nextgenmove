/**
 * Canonical integration shells shown in Admin → Integrations.
 * Live Firestore docs overlay these; catalog keeps the UI usable during outages.
 */
export interface IntegrationShell {
  id: string;
  name: string;
  category: string;
  description: string;
  iconUrl: string;
  status: "connected" | "not_connected";
  connectedAt: string | null;
  config: Record<string, string>;
}

export const INTEGRATION_CATALOG: IntegrationShell[] = [
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments & subscriptions",
    description:
      "Subscriptions with automatic monthly debit + one-time credit top-ups. Paste sk_/pk_/whsec keys to go live.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Payments & subscriptions" },
  },
  {
    id: "resend",
    name: "Resend",
    category: "Transactional email",
    description:
      "Fallback email provider when Gmail SMTP is offline. Paste re_ API key + verified from address.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Transactional email" },
  },
  {
    id: "gmail_smtp",
    name: "Gmail SMTP",
    category: "Transactional email",
    description:
      "Primary email for OTPs, notifications, and CRM — use a Google App Password with smtp.gmail.com.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Transactional email", host: "smtp.gmail.com", port: "465" },
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Transactional email",
    description:
      "Tertiary email fallback after Gmail SMTP and Resend. Paste an SG. API key + verified from address.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Transactional email" },
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "SMS",
    description: "CRM SMS / WhatsApp outreach (signup phone OTP uses Firebase).",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "SMS" },
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Media",
    description:
      "YouTube Data API — sync a playlist into homepage Stories and paid portal video libraries.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Media" },
  },
  {
    id: "google_places",
    name: "Google Places",
    category: "Maps & location",
    description:
      "Places Autocomplete for signup and profiles — country, city, and town worldwide.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Maps & location" },
  },
  {
    id: "firebase_admin",
    name: "Firebase Admin SDK",
    category: "Platform",
    description:
      "Server-side Auth, Firestore, and Storage. Set FIREBASE_ADMIN_* (service account) in Vercel env — not pasteable here.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Platform", envOnly: "true" },
  },
  {
    id: "firebase_client",
    name: "Firebase Client SDK",
    category: "Platform",
    description:
      "Browser Auth, Firestore listeners, and Storage uploads. Set NEXT_PUBLIC_FIREBASE_* web config in Vercel env — not pasteable here.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Platform", envOnly: "true" },
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Scheduling",
    description:
      "Calendar API for interview scheduling. Paste OAuth client ID, secret, and refresh token to create events when interviews are scheduled.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "Scheduling" },
  },
  {
    id: "gemini",
    name: "Gemini API",
    category: "AI",
    description:
      "Google Gemini — powers NGM Assistant and the public chatbot. Paste an API key from Google AI Studio.",
    iconUrl: "",
    status: "not_connected",
    connectedAt: null,
    config: { category: "AI" },
  },
];

export function mergeIntegrationCatalog(
  live: IntegrationShell[],
): IntegrationShell[] {
  const byId = new Map(live.map((item) => [item.id, item]));
  for (const shell of INTEGRATION_CATALOG) {
    const existing = byId.get(shell.id);
    if (!existing) {
      byId.set(shell.id, shell);
      continue;
    }
    // Overlay catalog defaults (e.g. envOnly) so live docs never drop UI flags.
    byId.set(shell.id, {
      ...shell,
      ...existing,
      name: existing.name || shell.name,
      description: existing.description || shell.description,
      category: existing.category || shell.category,
      iconUrl: existing.iconUrl || shell.iconUrl,
      config: { ...shell.config, ...existing.config },
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
