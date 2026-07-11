import { adminDb } from "@/lib/firebase-admin";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { appBaseUrl } from "@/lib/billing/stripe";

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

  return {
    siteName: settings.siteName || "NextGen Move",
    tagline: settings.tagline || "",
    logoUrl: settings.logoUrl || "",
    brandMark: settings.brandMark || "NG",
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
  const siteName = String(vars.siteName ?? "NextGen Move");
  const logoUrl = String(vars.logoUrl ?? "");
  const tagline = String(vars.tagline ?? "");
  const brandMark = String(vars.brandMark ?? "NG");
  const contactEmail = String(vars.contactEmail ?? "");
  const appUrl = String(vars.appUrl ?? "");
  const year = String(vars.year ?? new Date().getFullYear());

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" width="140" style="display:block;max-width:140px;height:auto;border:0;" />`
    : `<div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1a1625;letter-spacing:-0.02em;">${escapeHtml(brandMark)}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(siteName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2f7;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1625;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e1ef;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 16px;border-bottom:1px solid #e6e1ef;background:#1a1625;">
              <a href="${escapeHtml(appUrl)}" style="text-decoration:none;color:#ffffff;">
                ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" width="140" style="display:block;max-width:140px;height:auto;border:0;" />` : `<div style="font-family:Georgia,serif;font-size:24px;color:#ffffff;">${escapeHtml(siteName)}</div>`}
              </a>
              ${tagline ? `<p style="margin:8px 0 0;font-size:12px;color:#c9bfd9;letter-spacing:0.04em;">${escapeHtml(tagline)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:#1a1625;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#faf8fc;border-top:1px solid #e6e1ef;font-size:12px;line-height:1.5;color:#6b6478;">
              <p style="margin:0 0 8px;">${escapeHtml(siteName)}${tagline ? ` · ${escapeHtml(tagline)}` : ""}</p>
              ${contactEmail ? `<p style="margin:0 0 8px;">Support: <a href="mailto:${escapeHtml(contactEmail)}" style="color:#5b3d8f;">${escapeHtml(contactEmail)}</a></p>` : ""}
              <p style="margin:0;">© ${escapeHtml(year)} ${escapeHtml(siteName)}. All rights reserved.</p>
              <p style="margin:12px 0 0;">${logoBlock}</p>
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
