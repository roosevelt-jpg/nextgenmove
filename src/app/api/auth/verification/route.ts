import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getVerificationStatus,
  issueEmailOtp,
  markPhoneVerified,
  verifyEmailOtp,
} from "@/lib/auth/verification";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { withRequestLog } from "@/lib/observability/api-handler";

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/auth/verification" }, async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const status = await getVerificationStatus(user.uid);
    return NextResponse.json(status);
  });
}

const sendEmailSchema = z.object({
  action: z.literal("send_email_otp"),
});

const verifyEmailSchema = z.object({
  action: z.literal("verify_email_otp"),
  code: z.string().trim().min(4).max(12),
});

const confirmPhoneSchema = z.object({
  action: z.literal("confirm_phone"),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "invalid_phone"),
});

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/auth/verification" }, async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `auth:verify:ip:${ip}`,
      limit: 20,
      windowSec: 600,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const body = (await request.json().catch(() => null)) as
      | { action?: string }
      | null;
    const action = body?.action;

    if (action === "send_email_otp") {
      sendEmailSchema.parse(body);
      const status = await getVerificationStatus(user.uid);
      if (status.emailVerified) {
        return NextResponse.json({ ok: true, alreadyVerified: true });
      }
      if (!status.email) {
        return NextResponse.json({ error: "missing_email" }, { status: 400 });
      }
      const result = await issueEmailOtp({
        uid: user.uid,
        email: status.email,
        displayName: user.displayName ?? undefined,
        request,
      });
      if (!result.sent) {
        return NextResponse.json(
          { error: result.reason ?? "send_failed" },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "verify_email_otp") {
      const parsed = verifyEmailSchema.parse(body);
      const result = await verifyEmailOtp({
        uid: user.uid,
        code: parsed.code,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const status = await getVerificationStatus(user.uid);
      return NextResponse.json({ ok: true, ...status });
    }

    if (action === "confirm_phone") {
      const parsed = confirmPhoneSchema.parse(body);
      const { adminAuth } = await import("@/lib/firebase-admin");
      const authUser = await adminAuth.getUser(user.uid);
      if (
        !authUser.phoneNumber ||
        authUser.phoneNumber !== parsed.phoneE164
      ) {
        return NextResponse.json(
          { error: "phone_not_linked" },
          { status: 400 },
        );
      }
      await markPhoneVerified({
        uid: user.uid,
        phoneE164: parsed.phoneE164,
      });
      const status = await getVerificationStatus(user.uid);
      return NextResponse.json({ ok: true, ...status });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  });
}
