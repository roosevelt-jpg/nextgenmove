import { adminDb } from "@/lib/firebase-admin";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { appBaseUrl } from "@/lib/billing/stripe";
import {
  absoluteBrandAssetUrl,
  BRAND_LOGO_PATH,
} from "@/lib/brand";

export interface EmailTemplateDocument {
  id: string;
  name: string;
  description?: string;
  subject: string;
  /** Inner HTML body; wrapped in brand layout at send time. */
  htmlBody: string;
  textBody: string;
  /** Preference key under notificationPreferences; null = always send (security). */
  preferenceKey: string | null;
  category: "security" | "account" | "billing" | "credits" | "product" | "ops";
  enabled: boolean;
}

export type EmailVars = Record<string, string | number | boolean | null | undefined>;

export function interpolate(template: string, vars: EmailVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

export async function loadEmailTemplate(
  templateId: string,
): Promise<EmailTemplateDocument | null> {
  const snap = await adminDb.collection("email_templates").doc(templateId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.enabled === false) return null;

  return {
    id: snap.id,
    name: String(data.name ?? snap.id),
    description: data.description ? String(data.description) : undefined,
    subject: String(data.subject ?? ""),
    htmlBody: String(data.htmlBody ?? ""),
    textBody: String(data.textBody ?? ""),
    preferenceKey:
      data.preferenceKey === null || data.preferenceKey === undefined
        ? null
        : String(data.preferenceKey),
    category: (data.category as EmailTemplateDocument["category"]) ?? "product",
    enabled: data.enabled !== false,
  };
}

export async function buildBrandVars(request?: Request): Promise<EmailVars> {
  const settings = await getSiteSettings();
  const base = appBaseUrl(request);
  // Always the hardcoded public brand asset — never CMS / Storage URLs.
  const logoUrl =
    absoluteBrandAssetUrl(BRAND_LOGO_PATH) ||
    `${base}${BRAND_LOGO_PATH}`;

  return {
    siteName: settings.siteName || "Nextgenmove",
    tagline: settings.tagline || "",
    logoUrl,
    brandMark: settings.brandMark || "N",
    contactEmail: settings.contactEmail || "",
    appUrl: base,
    signInUrl: `${base}/sign-in`,
    supportUrl: settings.contactEmail
      ? `mailto:${settings.contactEmail}`
      : `${base}/`,
    year: new Date().getFullYear(),
  };
}

/** Branded HTML shell around template inner body. */
export function wrapBrandedHtml(innerHtml: string, vars: EmailVars): string {
  const siteName = String(vars.siteName ?? "Nextgenmove");
  const appUrl = String(vars.appUrl ?? "");
  const logoUrl =
    String(vars.logoUrl ?? "").trim() ||
    absoluteBrandAssetUrl(BRAND_LOGO_PATH) ||
    (appUrl ? `${appUrl}${BRAND_LOGO_PATH}` : BRAND_LOGO_PATH);
  const tagline = String(vars.tagline ?? "");
  const contactEmail = String(vars.contactEmail ?? "");
  const year = String(vars.year ?? new Date().getFullYear());

  // Brand tokens: purple #3C3489, amber #C97A2E
  const brandPurple = "#3C3489";
  const brandAmber = "#C97A2E";

  const logoImg = `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" width="160" height="36" style="display:block;max-width:160px;height:auto;border:0;" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(siteName)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f1f8;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f1a2e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #ddd6eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:3px solid ${brandAmber};background:#0a0a0a;">
              <a href="${escapeHtml(appUrl)}" style="text-decoration:none;color:#ffffff;">
                ${logoImg}
              </a>
              ${tagline ? `<p style="margin:8px 0 0;font-size:12px;color:#d6d0e8;letter-spacing:0.04em;">${escapeHtml(tagline)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:#1f1a2e;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#faf8fc;border-top:1px solid #ddd6eb;font-size:12px;line-height:1.5;color:#6b6478;">
              <p style="margin:0 0 8px;">${escapeHtml(siteName)}${tagline ? ` · ${escapeHtml(tagline)}` : ""}</p>
              ${contactEmail ? `<p style="margin:0 0 8px;">Support: <a href="mailto:${escapeHtml(contactEmail)}" style="color:${brandPurple};">${escapeHtml(contactEmail)}</a></p>` : ""}
              <p style="margin:0;">© ${escapeHtml(year)} ${escapeHtml(siteName)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
