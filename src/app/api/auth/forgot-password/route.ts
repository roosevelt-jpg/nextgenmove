import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { appBaseUrl } from "@/lib/billing/stripe";
import { notifyPasswordReset } from "@/lib/email/notify";
import { withRequestLog } from "@/lib/observability/api-handler";
import { logger } from "@/lib/observability/logger";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

function inAppResetUrl(firebaseLink: string, base: string): string {
  try {
    const parsed = new URL(firebaseLink);
    const oobCode = parsed.searchParams.get("oobCode");
    if (oobCode) {
      const reset = new URL("/reset-password", base);
      reset.searchParams.set("oobCode", oobCode);
      reset.searchParams.set("mode", "resetPassword");
      return reset.toString();
    }
  } catch {
    // fall through
  }
  return firebaseLink;
}

/** Always returns ok to avoid email enumeration (except validation / rate limit). */
export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/auth/forgot-password" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `auth:forgot:ip:${ip}`,
      limit: 8,
      windowSec: 3600,
    });
    if (!limited.allowed) return rateLimitResponse(limited.retryAfterSec);

    try {
      const { email } = schema.parse(await request.json());
      const normalized = email.trim().toLowerCase();

      const userSnap = await adminDb
        .collection("users")
        .where("email", "==", normalized)
        .limit(1)
        .get();

      let uid: string | null = null;
      let displayName = "";
      if (!userSnap.empty) {
        uid = userSnap.docs[0]!.id;
        displayName = String(userSnap.docs[0]!.data().displayName ?? "");
      } else {
        try {
          const record = await adminAuth.getUserByEmail(normalized);
          uid = record.uid;
          displayName = record.displayName ?? "";
        } catch {
          uid = null;
        }
      }

      if (uid) {
        const base = appBaseUrl(request);
        const firebaseLink = await adminAuth.generatePasswordResetLink(
          normalized,
          {
            url: `${base}/sign-in`,
            handleCodeInApp: false,
          },
        );
        const resetUrl = inAppResetUrl(firebaseLink, base);

        const sent = await notifyPasswordReset({
          email: normalized,
          displayName,
          resetUrl,
          request,
        });

        if (!sent) {
          logger.error("forgot_password_email_not_sent", {
            uid,
            email: normalized,
          });
        }
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      logger.error("forgot_password_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Still return ok — do not leak existence
      return NextResponse.json({ ok: true });
    }
  });
}
