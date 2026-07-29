import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  companyProfileSchema,
  registrationProfileRefine,
  studentProfileSchema,
  writeRegistrationDocuments,
} from "@/lib/auth/registration";
import { getVerificationStatus } from "@/lib/auth/verification";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const registerGoogleSchema = z
  .object({
    idToken: z.string().min(20),
    role: z.enum(["company", "student"]),
    consentRequired: z.literal(true),
    consentMarketing: z.boolean().optional(),
    consentRequiredAt: z.string().datetime().optional(),
    student: studentProfileSchema.optional(),
    company: companyProfileSchema.optional(),
  })
  .superRefine(registrationProfileRefine);

const REGISTER_LIMIT = { limit: 10, windowSec: 3600 };

function nextOnboardingStep(status: {
  emailVerified: boolean;
  phoneVerified: boolean;
}): "verify" | "media" {
  if (!status.emailVerified || !status.phoneVerified) return "verify";
  return "media";
}

export async function POST(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/auth/register-google" },
    async () => {
      const ip = clientIpFromRequest(request);
      const limited = await enforceRateLimit({
        key: `auth:register-google:ip:${ip}`,
        ...REGISTER_LIMIT,
      });
      if (!limited.allowed) {
        return rateLimitResponse(limited.retryAfterSec);
      }

      try {
        const body = registerGoogleSchema.parse(await request.json());
        const decoded = await adminAuth.verifyIdToken(body.idToken);
        const uid = decoded.uid;
        const email = (decoded.email ?? "").trim().toLowerCase();
        if (!email) {
          return NextResponse.json({ error: "missing_email" }, { status: 400 });
        }

        const existing = await adminDb.collection("users").doc(uid).get();
        if (existing.exists) {
          const data = existing.data() ?? {};
          const role = String(data.role ?? body.role);
          if (data.profileComplete) {
            return NextResponse.json({
              uid,
              role,
              alreadyRegistered: true,
              profileComplete: true,
              nextStep: "done",
            });
          }
          const status = await getVerificationStatus(uid);
          return NextResponse.json({
            uid,
            role,
            alreadyRegistered: true,
            profileComplete: false,
            nextStep: nextOnboardingStep(status),
            emailVerified: status.emailVerified,
            phoneVerified: status.phoneVerified,
            phone: status.phone,
          });
        }

        const displayName =
          body.role === "student"
            ? body.student!.fullName
            : body.company!.contactName;
        const phoneRaw =
          body.role === "student"
            ? body.student!.phone?.trim() || null
            : body.company!.phone?.trim() || null;

        // Align Auth display name with profile.
        try {
          await adminAuth.updateUser(uid, { displayName });
        } catch {
          // non-fatal
        }

        const { referralWarning } = await writeRegistrationDocuments({
          uid,
          email,
          role: body.role,
          displayName,
          phoneRaw,
          consentMarketing: body.consentMarketing,
          consentRequiredAt: body.consentRequiredAt,
          student: body.student,
          company: body.company,
          request,
        });

        // Google emails are often already verified on the IdP.
        if (decoded.email_verified) {
          await adminDb
            .collection("users")
            .doc(uid)
            .set(
              {
                emailVerified: true,
              },
              { merge: true },
            );
          try {
            await adminAuth.updateUser(uid, { emailVerified: true });
          } catch {
            // non-fatal
          }
        }

        const status = await getVerificationStatus(uid);

        return NextResponse.json({
          uid,
          role: body.role,
          nextStep: nextOnboardingStep(status),
          emailVerified: status.emailVerified,
          phoneVerified: status.phoneVerified,
          phone: status.phone,
          ...(referralWarning ? { referralWarning } : {}),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: "invalid_request" }, { status: 400 });
        }

        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : null;

        if (
          code === "auth/id-token-expired" ||
          code === "auth/argument-error" ||
          code === "auth/invalid-id-token"
        ) {
          return NextResponse.json({ error: "invalid_token" }, { status: 401 });
        }

        await captureException(error, { route: "/api/auth/register-google" });
        logger.error("register_google_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          { error: "register_failed" },
          { status: 500 },
        );
      }
    },
  );
}
