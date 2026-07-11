import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta, getWayToEarnCredits } from "@/lib/credits/ledger";
import { applyReferralCode, ensureStudentReferralCode } from "@/lib/credits/referrals";
import { stripUndefined } from "@/lib/stripUndefined";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const optionalUrl = z
  .union([z.string().trim().url(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value == null ? null : value));

const studentProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  sector: z.string().trim().min(1).max(80),
  seniority: z.string().trim().min(1).max(80),
  currentCity: z.string().trim().min(1).max(80),
  targetCities: z.array(z.string().trim().min(1)).min(1).max(12),
  bio: z.string().trim().max(2000).optional(),
  skills: z.array(z.string().trim().min(1)).max(40).optional(),
  availability: z.string().trim().max(80).optional(),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  referralCode: z.string().trim().max(32).optional(),
});

const companyProfileSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  contactName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  industry: z.string().trim().min(1).max(80),
  website: optionalUrl,
  preferredLocations: z.array(z.string().trim().min(1)).min(1).max(12),
  hiringNeeds: z.string().trim().max(2000).optional(),
});

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["company", "student"]),
    consentRequired: z.literal(true),
    consentMarketing: z.boolean().optional(),
    consentRequiredAt: z.string().datetime().optional(),
    student: studentProfileSchema.optional(),
    company: companyProfileSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "student" && !value.student) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "student_profile_required",
        path: ["student"],
      });
    }
    if (value.role === "company" && !value.company) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "company_profile_required",
        path: ["company"],
      });
    }
  });

/** Rate limits: 10 registrations / IP / hour */
const REGISTER_LIMIT = { limit: 10, windowSec: 3600 };

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/auth/register" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `auth:register:ip:${ip}`,
      ...REGISTER_LIMIT,
    });

    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    try {
      const body = registerSchema.parse(await request.json());
      const email = body.email.trim().toLowerCase();
      const displayName =
        body.role === "student"
          ? body.student!.fullName
          : body.company!.contactName;
      const phone =
        body.role === "student"
          ? body.student!.phone?.trim() || null
          : body.company!.phone?.trim() || null;

      const userRecord = await adminAuth.createUser({
        email,
        password: body.password,
        displayName,
      });

      const uid = userRecord.uid;
      const batch = adminDb.batch();
      const now = FieldValue.serverTimestamp();

      batch.set(
        adminDb.collection("users").doc(uid),
        stripUndefined({
          uid,
          email,
          role: body.role,
          displayName,
          photoUrl: null,
          phone,
          createdAt: now,
          lastLoginAt: null,
          status: "active",
          profileComplete: false,
        }),
      );

      if (body.role === "company" && body.company) {
        const company = body.company;
        batch.set(
          adminDb.collection("companies").doc(uid),
          stripUndefined({
            id: uid,
            userId: uid,
            name: company.companyName,
            contactName: company.contactName,
            contactEmail: email,
            logoUrl: null,
            industry: company.industry,
            website: company.website ?? null,
            plan: null,
            subscriptionStatus: "pending",
            requirements: [],
            preferredLocations: company.preferredLocations,
            requirementTags: [],
            hiringNeeds: company.hiringNeeds?.trim() || "",
            createdAt: now,
          }),
        );
      }

      if (body.role === "student" && body.student) {
        const student = body.student;
        batch.set(
          adminDb.collection("students").doc(uid),
          stripUndefined({
            id: uid,
            userId: uid,
            fullName: student.fullName,
            email,
            photoUrl: null,
            sector: student.sector,
            seniority: student.seniority,
            currentCity: student.currentCity,
            targetCities: student.targetCities,
            cvUrl: null,
            linkedinUrl: student.linkedinUrl ?? null,
            portfolioUrl: student.portfolioUrl ?? null,
            bio: student.bio?.trim() || "",
            skills: student.skills ?? [],
            availability: student.availability?.trim() || "",
            credits: 0,
            status: "active",
            createdAt: now,
          }),
        );
      }

      const consentRef = adminDb.collection("consent_records").doc();
      batch.set(
        consentRef,
        stripUndefined({
          id: consentRef.id,
          userId: uid,
          requiredProcessing: true,
          requiredProcessingAt: body.consentRequiredAt ?? now,
          marketing: Boolean(body.consentMarketing),
          marketingAt: body.consentMarketing ? now : null,
          source: "registration",
          createdAt: now,
        }),
      );

      await batch.commit();

      const { notifyAccountCreated, notifyWelcomeCredits } = await import(
        "@/lib/email/notify"
      );
      const { appBaseUrl } = await import("@/lib/billing/stripe");
      void notifyAccountCreated({
        userId: uid,
        role: body.role,
        request,
      });

      // Branded verification link (SendGrid) — fire-and-forget
      try {
        const verifyUrl = await adminAuth.generateEmailVerificationLink(email, {
          url: `${appBaseUrl(request)}/sign-in`,
          handleCodeInApp: false,
        });
        const { notifyEmailVerification } = await import("@/lib/email/notify");
        void notifyEmailVerification({
          userId: uid,
          verifyUrl,
          request,
        });
      } catch {
        // Verification email is best-effort at signup
      }

      if (body.role === "student") {
        const welcomeCredits = await getWayToEarnCredits("welcome");
        if (welcomeCredits > 0) {
          const grant = await applyCreditDelta({
            studentId: uid,
            amount: welcomeCredits,
            source: "welcome",
            once: true,
            request,
          });
          if (grant.applied) {
            void notifyWelcomeCredits({
              studentId: uid,
              credits: welcomeCredits,
              balance: grant.credits,
              request,
            });
          }
        }
        await ensureStudentReferralCode(uid);

        const referral = body.student?.referralCode?.trim();
        if (referral) {
          await applyReferralCode({ studentId: uid, code: referral });
        }
      }

      return NextResponse.json({
        uid,
        role: body.role,
        nextStep: "media",
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

      if (code === "auth/email-already-exists") {
        return NextResponse.json({ error: "email_exists" }, { status: 409 });
      }

      await captureException(error, { route: "/api/auth/register" });
      logger.error("register_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "register_failed" }, { status: 500 });
    }
  });
}
