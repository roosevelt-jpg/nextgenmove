import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/observability/logger";
import { stripUndefined } from "@/lib/stripUndefined";
import type { UserRole } from "@/types/user";
import { shouldSendEmail } from "@/lib/email/preferences";
import {
  isResendLive,
  ResendNotConfiguredError,
  sendViaResend,
} from "@/lib/email/resend";
import {
  isSmtpLive,
  sendViaSmtp,
  SmtpNotConfiguredError,
} from "@/lib/email/smtp";
import {
  buildBrandVars,
  interpolate,
  loadEmailTemplate,
  wrapBrandedHtml,
  type EmailVars,
} from "@/lib/email/templates";

export interface SendTransactionalOptions {
  templateId: string;
  to: string;
  vars?: EmailVars;
  userId?: string | null;
  role?: UserRole | null;
  /** Extra idempotency key — skips if same key already sent. */
  dedupeKey?: string | null;
  request?: Request;
}

async function deliverEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<"gmail_smtp" | "resend"> {
  const smtpReady = await isSmtpLive();
  if (smtpReady) {
    try {
      await sendViaSmtp(options);
      return "gmail_smtp";
    } catch (error) {
      logger.error("email_smtp_failed_falling_back", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!(await isResendLive())) {
    throw new ResendNotConfiguredError();
  }
  await sendViaResend(options);
  return "resend";
}

export async function isAnyEmailProviderLive(): Promise<boolean> {
  return (await isSmtpLive()) || (await isResendLive());
}

/**
 * Load CMS template, check preferences, send via Gmail SMTP (primary) or Resend.
 * Never throws to callers for delivery failures — logs and returns status.
 */
export async function sendTransactional(
  options: SendTransactionalOptions,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!(await isAnyEmailProviderLive())) {
      logger.info("email_skipped_not_configured", { templateId: options.templateId });
      return { sent: false, reason: "not_configured" };
    }

    const template = await loadEmailTemplate(options.templateId);
    if (!template) {
      logger.info("email_skipped_missing_template", { templateId: options.templateId });
      return { sent: false, reason: "missing_template" };
    }

    const allowed = await shouldSendEmail({
      userId: options.userId,
      role: options.role,
      preferenceKey: template.preferenceKey,
    });
    if (!allowed) {
      return { sent: false, reason: "preference_opt_out" };
    }

    if (options.dedupeKey) {
      const dedupeRef = adminDb.collection("email_sends").doc(options.dedupeKey);
      const existing = await dedupeRef.get();
      if (existing.exists) {
        return { sent: false, reason: "duplicate" };
      }
    }

    const brand = await buildBrandVars(options.request);
    const vars: EmailVars = { ...brand, ...(options.vars ?? {}) };
    const subject = interpolate(template.subject, vars);
    const text = interpolate(template.textBody, vars);
    const innerHtml = interpolate(template.htmlBody, vars);
    const html = wrapBrandedHtml(innerHtml, vars);

    const settings = await adminDb.collection("site_settings").doc("default").get();
    const replyTo = String(settings.data()?.contactEmail ?? "").trim() || undefined;

    const provider = await deliverEmail({
      to: options.to,
      subject,
      html,
      text,
      replyTo,
    });

    if (options.dedupeKey) {
      await adminDb
        .collection("email_sends")
        .doc(options.dedupeKey)
        .set(
          stripUndefined({
            id: options.dedupeKey,
            templateId: options.templateId,
            to: options.to,
            userId: options.userId ?? null,
            provider,
            sentAt: FieldValue.serverTimestamp(),
          }),
        );
    }

    logger.info("email_sent", {
      templateId: options.templateId,
      to: options.to,
      userId: options.userId ?? null,
      provider,
    });

    return { sent: true };
  } catch (error) {
    if (
      error instanceof ResendNotConfiguredError ||
      error instanceof SmtpNotConfiguredError
    ) {
      return { sent: false, reason: "not_configured" };
    }
    logger.error("email_send_failed", {
      templateId: options.templateId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, reason: "send_failed" };
  }
}

/** Fire-and-forget wrapper — never blocks the main request path. */
export function queueTransactional(options: SendTransactionalOptions): void {
  void sendTransactional(options);
}

/** Raw send for CRM / one-off messages (no CMS template). */
export async function sendRawEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!(await isAnyEmailProviderLive())) {
      return { sent: false, reason: "not_configured" };
    }
    await deliverEmail(options);
    return { sent: true };
  } catch (error) {
    if (
      error instanceof ResendNotConfiguredError ||
      error instanceof SmtpNotConfiguredError
    ) {
      return { sent: false, reason: "not_configured" };
    }
    logger.error("email_raw_send_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, reason: "send_failed" };
  }
}
