import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { appBaseUrl } from "@/lib/billing/stripe";
import { notifyPasswordReset } from "@/lib/email/notify";
import { withRequestLog } from "@/lib/observability/api-handler";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

/** Always returns ok to avoid email enumeration. */
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

      // Also try exact email match if stored with different casing
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
        const resetUrl = await adminAuth.generatePasswordResetLink(normalized, {
          url: `${base}/sign-in`,
          handleCodeInApp: false,
        });

        await notifyPasswordReset({
          email: normalized,
          displayName,
          resetUrl,
          request,
        });
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      // Still return ok — do not leak existence
      return NextResponse.json({ ok: true });
    }
  });
}
