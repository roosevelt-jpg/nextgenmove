import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  PORTAL_HOME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  IMPERSONATE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { signRoleToken } from "@/lib/auth/role-token";
import { withTimeout } from "@/lib/async/with-timeout";
import { stripUndefined } from "@/lib/stripUndefined";
import type { UserDocument, UserRole } from "@/types/user";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const sessionSchema = z.object({
  idToken: z.string().min(1),
});

/** Rate limits: 20 logins / IP / minute */
const LOGIN_LIMIT = { limit: 20, windowSec: 60 };

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

function seedAdminEmails(): Set<string> {
  const emails = new Set<string>();
  const primary = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (primary) emails.add(primary);
  const extra = process.env.SEED_ADMIN_EMAILS?.split(",") ?? [];
  for (const raw of extra) {
    const email = raw.trim().toLowerCase();
    if (email) emails.add(email);
  }
  // Domain migration aliases — keep login working across cutover
  emails.add("admin@venturo.ae");
  emails.add("admin@nextgenmove.agency");
  return emails;
}

function isSeedAdminEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  return Boolean(normalized && seedAdminEmails().has(normalized));
}

async function resolveLoginUser(decoded: {
  uid: string;
  email?: string;
  role?: unknown;
}): Promise<{
  uid: string;
  role: UserRole;
  status: "active" | "suspended";
  lastLoginIp?: string;
  fromClaims: boolean;
}> {
  // Resolve Auth-side role first (no Firestore). Used when Firestore is down
  // and to seed admin even if the ID token omitted email.
  let roleFromAuth: UserRole | null = isUserRole(decoded.role)
    ? decoded.role
    : isSeedAdminEmail(decoded.email)
      ? "admin"
      : null;

  if (!roleFromAuth) {
    try {
      const authUser = await withTimeout(
        adminAuth.getUser(decoded.uid),
        5000,
        "auth_user_lookup",
      );
      const claimRole = authUser.customClaims?.role;
      if (isUserRole(claimRole)) {
        roleFromAuth = claimRole;
      } else if (isSeedAdminEmail(authUser.email)) {
        roleFromAuth = "admin";
      }
    } catch (error) {
      logger.error("session_auth_user_lookup_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (roleFromAuth === "admin") {
    void adminAuth
      .setCustomUserClaims(decoded.uid, { role: "admin" })
      .catch(() => undefined);
  }

  // Firestore is source of truth for role + suspension when quota allows.
  try {
    const userSnapshot = await withTimeout(
      adminDb.collection("users").doc(decoded.uid).get(),
      2500,
      "user_lookup",
    );

    if (userSnapshot.exists) {
      const user = userSnapshot.data() as UserDocument;
      if (!isUserRole(user.role)) {
        throw new Error("invalid_role");
      }
      void adminAuth
        .setCustomUserClaims(decoded.uid, { role: user.role })
        .catch((error) => {
          logger.error("session_claims_sync_failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        });

      return {
        uid: user.uid || decoded.uid,
        role: user.role,
        status: user.status === "suspended" ? "suspended" : "active",
        lastLoginIp: String(userSnapshot.data()?.lastLoginIp ?? ""),
        fromClaims: false,
      };
    }
  } catch (error) {
    logger.error("session_user_lookup_degraded", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (roleFromAuth) {
    return {
      uid: decoded.uid,
      role: roleFromAuth,
      status: "active",
      fromClaims: true,
    };
  }

  throw new Error("user_lookup_unavailable");
}

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/auth/session" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `auth:login:ip:${ip}`,
      ...LOGIN_LIMIT,
    });

    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    try {
      const { idToken } = sessionSchema.parse(await request.json());
      const decoded = await withTimeout(
        adminAuth.verifyIdToken(idToken),
        10000,
        "verify_id_token",
      );

      const user = await resolveLoginUser(decoded);

      if (user.status === "suspended") {
        return NextResponse.json({ error: "account_suspended" }, { status: 403 });
      }

      let expireDays = 5;
      let require2fa = false;
      try {
        const settingsSnap = await withTimeout(
          adminDb.collection("site_settings").doc("default").get(),
          2500,
          "session_settings",
        );
        const settingsData = settingsSnap.data() ?? {};
        expireDays = Number(settingsData.sessionExpireDays ?? 5);
        require2fa = Boolean(settingsData.require2fa);
      } catch (settingsError) {
        logger.error("session_settings_unavailable", {
          error:
            settingsError instanceof Error
              ? settingsError.message
              : String(settingsError),
        });
      }

      if (require2fa && !decoded.email_verified) {
        // Allow incomplete signups through so verify/media steps can set cookies.
        let profileComplete = false;
        try {
          const profileSnap = await withTimeout(
            adminDb.collection("users").doc(user.uid).get(),
            1500,
            "profile_complete_check",
          );
          profileComplete = Boolean(profileSnap.data()?.profileComplete);
        } catch {
          profileComplete = false;
        }
        if (profileComplete) {
          return NextResponse.json(
            { error: "email_verification_required" },
            { status: 403 },
          );
        }
      }

      const expiresInMs = Math.min(Math.max(expireDays, 1), 14) * 24 * 60 * 60 * 1000;

      const sessionCookie = await withTimeout(
        adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs }),
        10000,
        "create_session_cookie",
      );
      const roleToken = await signRoleToken({
        uid: user.uid,
        role: user.role,
      });

      const userAgent = request.headers.get("user-agent") ?? "unknown";
      const previousIp = user.lastLoginIp ?? "";
      const when = new Date().toISOString();

      if (!user.fromClaims) {
        void adminDb
          .collection("users")
          .doc(user.uid)
          .update(
            stripUndefined({
              lastLoginAt: FieldValue.serverTimestamp(),
              lastLoginIp: ip,
              lastLoginUserAgent: userAgent.slice(0, 300),
            }),
          )
          .catch((auditError) => {
            logger.error("session_login_audit_failed", {
              error:
                auditError instanceof Error
                  ? auditError.message
                  : String(auditError),
            });
          });

        void import("@/lib/email/notify")
          .then(({ notifyLoginAlert, notifySuspiciousLogin }) => {
            void notifyLoginAlert({
              userId: user.uid,
              ip,
              userAgent,
              when,
              request,
            });
            if (previousIp && previousIp !== ip && previousIp !== "unknown") {
              void notifySuspiciousLogin({
                userId: user.uid,
                ip,
                previousIp,
                userAgent,
                when,
                request,
              });
            }
          })
          .catch(() => undefined);
      }

      const response = NextResponse.json({
        role: user.role,
        redirectTo: PORTAL_HOME[user.role],
        degraded: user.fromClaims || undefined,
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }

      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("timeout") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message === "user_lookup_unavailable"
      ) {
        await captureException(error, { route: "/api/auth/session" });
        logger.error("session_unavailable", { error: message });
        return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
      }

      await captureException(error, { route: "/api/auth/session" });
      logger.error("session_failed", {
        error: message,
      });
      return NextResponse.json({ error: "session_failed" }, { status: 401 });
    }
  });
}
