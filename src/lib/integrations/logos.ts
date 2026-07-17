/** Default brand logos for known integrations (under /public/integrations). */
export const INTEGRATION_LOGO_PATHS: Record<string, string> = {
  stripe: "/integrations/stripe.svg",
  resend: "/integrations/resend.svg",
  sendgrid: "/integrations/sendgrid.svg",
  twilio: "/integrations/twilio.svg",
  youtube: "/integrations/youtube.svg",
  google_places: "/integrations/google_places.svg",
  gmail_smtp: "/integrations/gmail_smtp.svg",
};

export function resolveIntegrationLogoUrl(
  id: string,
  iconUrl?: string | null,
): string | null {
  const custom = iconUrl?.trim();
  if (custom) return custom;
  return INTEGRATION_LOGO_PATHS[id] ?? null;
}
