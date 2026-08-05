import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  clearLogin2faPass,
  confirmLoginPhone,
  hasValidLogin2faPass,
  issueLoginEmailOtp,
  resolveAdminPhone,
  verifyLoginEmailOtp,
} from "@/lib/auth/login-2fa";
import {
  PORTAL_HOME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  IMPERSONATE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { signRoleToken } from "@/lib/auth/role-token";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { withRequestLog } from "@/lib/observability/api-handler";
import type { UserRole } from "@/types/user";

const sendEmailSchema = z.object({
  action: z.literal("send_email_otp"),
  idToken: z.string().min(1),
});

const verifyEmailSchema = z.object({
  action: z.literal("verify_email_otp"),
  idToken: z.string().min(1),
  code: z.string().trim().min(4).max(12),
});

const confirmPhoneSchema = z.object({
  action: z.literal("confirm_phone"),
  idToken: z.string().min(1),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "invalid_phone"),
});

const completeSchema = z.object({
  action: z.literal("complete_session"),
  idToken: z.string().min(1),
});

function buildCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: Math.floor(maxAgeMs / 1000),
    path: "/",
  };
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "company" || value === "student";
}

function isSeedAdminEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  const emails = new Set<string>();
  const primary = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (primary) emails.add(primary);
  for (const raw of (process.env.SEED_ADMIN_EMAILS ?? "").split(",")) {
    const e = raw.trim().toLowerCase();
    if (e) emails.add(e);
  }
  emails.add("info@nextgenmove.agency");
  emails.add("admin@nextgenmove.agency");
  emails.add("admin@venturo.ae");
  return emails.has(normalized);
}

async function requireAdminFromIdToken(idToken: string) {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const roleFromDoc = userSnap.data()?.role;
  let role: UserRole | null = isUserRole(roleFromDoc) ? roleFromDoc : null;

  if (!role) {
    const claimRole = (decoded as { role?: unknown }).role;
    if (isUserRole(claimRole)) role = claimRole;
  }
  if (!role && isSeedAdminEmail(decoded.email)) {
    role = "admin";
  }
  if (!role) {
    try {
      const authUser = await adminAuth.getUser(decoded.uid);
      const claimRole = authUser.customClaims?.role;
      if (isUserRole(claimRole)) role = claimRole;
      else if (isSeedAdminEmail(authUser.email)) role = "admin";
    } catch {
      // ignore
    }
  }

  if (role !== "admin") {
    return { error: "admin_required" as const, decoded: null, role: null };
  }

  return { error: null, decoded, role };
}

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/auth/login-2fa" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `auth:login2fa:ip:${ip}`,
      limit: 20,
      windowSec: 600,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const body = (await request.json().catch(() => null)) as
      | { action?: string; idToken?: string }
      | null;
    const action = body?.action;

    try {
      if (action === "send_email_otp") {
        const parsed = sendEmailSchema.parse(body);
        const authz = await requireAdminFromIdToken(parsed.idToken);
        if (authz.error || !authz.decoded) {
          return NextResponse.json({ error: authz.error }, { status: 403 });
        }

        const uidLimited = await enforceRateLimit({
          key: `auth:login2fa:email:${authz.decoded.uid}`,
          limit: 5,
          windowSec: 600,
        });
        if (!uidLimited.allowed) {
          return rateLimitResponse(uidLimited.retryAfterSec);
        }

        const email =
          authz.decoded.email ||
          (await adminAuth.getUser(authz.decoded.uid)).email;
        if (!email) {
          return NextResponse.json({ error: "missing_email" }, { status: 400 });
        }

        const userSnap = await adminDb
          .collection("users")
          .doc(authz.decoded.uid)
          .get();
        const result = await issueLoginEmailOtp({
          uid: authz.decoded.uid,
          email,
          displayName: String(userSnap.data()?.displayName ?? email),
          request,
        });
        if (!result.sent) {
          return NextResponse.json(
            { error: result.reason ?? "email_otp_send_failed" },
            { status: 502 },
          );
        }
        return NextResponse.json({ ok: true });
      }

      if (action === "verify_email_otp") {
        const parsed = verifyEmailSchema.parse(body);
        const authz = await requireAdminFromIdToken(parsed.idToken);
        if (authz.error || !authz.decoded) {
          return NextResponse.json({ error: authz.error }, { status: 403 });
        }

        const result = await verifyLoginEmailOtp({
          uid: authz.decoded.uid,
          code: parsed.code,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      if (action === "confirm_phone") {
        const parsed = confirmPhoneSchema.parse(body);
        const authz = await requireAdminFromIdToken(parsed.idToken);
        if (authz.error || !authz.decoded) {
          return NextResponse.json({ error: authz.error }, { status: 403 });
        }

        const result = await confirmLoginPhone({
          uid: authz.decoded.uid,
          phoneE164: parsed.phoneE164,
          tokenPhone: authz.decoded.phone_number,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      if (action === "complete_session") {
        const parsed = completeSchema.parse(body);
        const authz = await requireAdminFromIdToken(parsed.idToken);
        if (authz.error || !authz.decoded || !authz.role) {
          return NextResponse.json({ error: authz.error }, { status: 403 });
        }

        const passed = await hasValidLogin2faPass(authz.decoded.uid);
        if (!passed) {
          const phone = await resolveAdminPhone(authz.decoded.uid);
          return NextResponse.json(
            {
              error: "two_factor_required",
              methods: { email: true, phone: Boolean(phone) },
            },
            { status: 403 },
          );
        }

        let expireDays = 5;
        try {
          const settingsSnap = await adminDb
            .collection("site_settings")
            .doc("default")
            .get();
          expireDays = Number(settingsSnap.data()?.sessionExpireDays ?? 5);
        } catch {
          // defaults
        }

        const expiresInMs =
          Math.min(Math.max(expireDays, 1), 14) * 24 * 60 * 60 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(
          parsed.idToken,
          { expiresIn: expiresInMs },
        );
        const roleToken = await signRoleToken({
          uid: authz.decoded.uid,
          role: authz.role,
        });

        await clearLogin2faPass(authz.decoded.uid);

        const response = NextResponse.json({
          role: authz.role,
          redirectTo: PORTAL_HOME[authz.role],
        });
        response.cookies.set(
          SESSION_COOKIE_NAME,
          sessionCookie,
          buildCookieOptions(expiresInMs),
        );
        response.cookies.set(
          ROLE_COOKIE_NAME,
          roleToken,
          buildCookieOptions(expiresInMs),
        );
        response.cookies.set(IMPERSONATE_COOKIE_NAME, "", buildCookieOptions(0));
        return response;
      }

      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      console.error("login_2fa_failed", error);
      return NextResponse.json({ error: "login_2fa_failed" }, { status: 500 });
    }
  });
}
