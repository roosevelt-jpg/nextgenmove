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
    name: "SendGrid (legacy)",
    category: "Transactional email",
    description:
      "Legacy email provider — Venturo prefers Gmail SMTP, then Resend. Kept for reference only.",
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
];

export function mergeIntegrationCatalog(
  live: IntegrationShell[],
): IntegrationShell[] {
  const byId = new Map(live.map((item) => [item.id, item]));
  for (const shell of INTEGRATION_CATALOG) {
    if (!byId.has(shell.id)) {
      byId.set(shell.id, shell);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
