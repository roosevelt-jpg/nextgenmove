/**
 * Shared signup registration helpers (password + Google provision).
 */
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta, getWayToEarnCredits } from "@/lib/credits/ledger";
import {
  applyReferralCode,
  ensureStudentReferralCode,
} from "@/lib/credits/referrals";
import { normalizeToE164 } from "@/lib/phone/e164";
import { stripUndefined } from "@/lib/stripUndefined";
import { logger } from "@/lib/observability/logger";

export const optionalUrl = z
  .union([z.string().trim().url(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value == null ? null : value));

const educationEntrySchema = z.object({
  institution: z.string().trim().min(1).max(160),
  degree: z.string().trim().max(120).optional(),
  year: z.string().trim().max(20).optional(),
});

export const studentProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  nationality: z.string().trim().min(1).max(80),
  workExperience: z.string().trim().min(1).max(4000),
  education: z.array(educationEntrySchema).min(1).max(12),
  sector: z.string().trim().min(1).max(80),
  seniority: z.string().trim().min(1).max(80),
  currentCity: z.string().trim().min(1).max(120),
  targetCities: z.array(z.string().trim().min(1)).min(1).max(12),
  country: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().max(8).optional(),
  town: z.string().trim().max(120).optional(),
  suburb: z.string().trim().max(120).optional(),
  placeId: z.string().trim().max(256).optional(),
  formattedAddress: z.string().trim().max(300).optional(),
  bio: z.string().trim().max(2000).optional(),
  skills: z.array(z.string().trim().min(1)).max(40).optional(),
  availability: z.string().trim().max(80).optional(),
  gender: z.string().trim().max(40).optional(),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  referralCode: z.string().trim().max(32).optional(),
});

export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  contactName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  nationality: z.string().trim().min(1).max(80),
  industry: z.string().trim().min(1).max(80),
  website: optionalUrl,
  preferredLocations: z.array(z.string().trim().min(1)).min(1).max(12),
  country: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().max(8).optional(),
  city: z.string().trim().max(120).optional(),
  town: z.string().trim().max(120).optional(),
  suburb: z.string().trim().max(120).optional(),
  placeId: z.string().trim().max(256).optional(),
  formattedAddress: z.string().trim().max(300).optional(),
  hiringNeeds: z.string().trim().max(2000).optional(),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export function registrationProfileRefine(
  value: {
    role: "company" | "student";
    student?: StudentProfileInput;
    company?: CompanyProfileInput;
  },
  ctx: z.RefinementCtx,
) {
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
}

export async function writeRegistrationDocuments(options: {
  uid: string;
  email: string;
  role: "company" | "student";
  displayName: string;
  phoneRaw: string | null;
  consentMarketing?: boolean;
  consentRequiredAt?: string;
  student?: StudentProfileInput;
  company?: CompanyProfileInput;
  request?: Request;
}): Promise<{ referralWarning?: string }> {
  const phone = options.phoneRaw
    ? normalizeToE164(options.phoneRaw) ?? options.phoneRaw
    : null;
  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

  batch.set(
    adminDb.collection("users").doc(options.uid),
    stripUndefined({
      uid: options.uid,
      email: options.email,
      role: options.role,
      displayName: options.displayName,
      photoUrl: null,
      phone,
      emailVerified: false,
      phoneVerified: false,
      createdAt: now,
      lastLoginAt: null,
      status: "active",
      profileComplete: false,
    }),
  );

  if (options.role === "company" && options.company) {
    const company = options.company;
    batch.set(
      adminDb.collection("companies").doc(options.uid),
      stripUndefined({
        id: options.uid,
        userId: options.uid,
        name: company.companyName,
        contactName: company.contactName,
        contactEmail: options.email,
        contactPhone: phone || company.phone.trim(),
        nationality: company.nationality,
        logoUrl: null,
        industry: company.industry,
        website: company.website ?? null,
        plan: null,
        subscriptionStatus: "pending",
        requirements: [],
        preferredLocations: company.preferredLocations,
        country: company.country?.trim() || "",
        countryCode: company.countryCode?.trim().toUpperCase() || "",
        city: company.city?.trim() || "",
        town: company.town?.trim() || "",
        suburb: company.suburb?.trim() || "",
        placeId: company.placeId?.trim() || "",
        formattedAddress: company.formattedAddress?.trim() || "",
        requirementTags: [],
        hiringNeeds: company.hiringNeeds?.trim() || "",
        credits: 0,
        createdAt: now,
      }),
    );
  }

  if (options.role === "student" && options.student) {
    const student = options.student;
    batch.set(
      adminDb.collection("students").doc(options.uid),
      stripUndefined({
        id: options.uid,
        userId: options.uid,
        fullName: student.fullName,
        email: options.email,
        phone: phone || student.phone.trim(),
        nationality: student.nationality,
        workExperience: student.workExperience.trim(),
        education: student.education,
        photoUrl: null,
        sector: student.sector,
        seniority: student.seniority,
        currentCity: student.currentCity,
        targetCities: student.targetCities,
        country: student.country?.trim() || "",
        countryCode: student.countryCode?.trim().toUpperCase() || "",
        town: student.town?.trim() || "",
        suburb: student.suburb?.trim() || "",
        placeId: student.placeId?.trim() || "",
        formattedAddress: student.formattedAddress?.trim() || "",
        gender: student.gender?.trim() || "",
        cvUrl: null,
        linkedinUrl: student.linkedinUrl ?? null,
        portfolioUrl: student.portfolioUrl ?? null,
        bio: student.bio?.trim() || "",
        skills: student.skills ?? [],
        availability: student.availability?.trim() || "",
        credits: 0,
        plan: null,
        subscriptionStatus: "pending",
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
      userId: options.uid,
      requiredProcessing: true,
      requiredProcessingAt: options.consentRequiredAt ?? now,
      marketing: Boolean(options.consentMarketing),
      marketingAt: options.consentMarketing ? now : null,
      source: "registration",
      createdAt: now,
    }),
  );

  await batch.commit();

  try {
    await adminAuth.setCustomUserClaims(options.uid, { role: options.role });
  } catch (claimsError) {
    logger.error("register_claims_failed", {
      error:
        claimsError instanceof Error
          ? claimsError.message
          : String(claimsError),
    });
  }

  const { notifyAccountCreated, notifyWelcomeCredits } = await import(
    "@/lib/email/notify"
  );
  void notifyAccountCreated({
    userId: options.uid,
    role: options.role,
    request: options.request,
  });

  try {
    const { issueEmailOtp } = await import("@/lib/auth/verification");
    void issueEmailOtp({
      uid: options.uid,
      email: options.email,
      displayName: options.displayName,
      request: options.request,
    });
  } catch {
    // best-effort
  }

  let referralWarning: string | undefined;
  if (options.role === "student") {
    const welcomeCredits = await getWayToEarnCredits("welcome");
    if (welcomeCredits > 0) {
      const grant = await applyCreditDelta({
        studentId: options.uid,
        amount: welcomeCredits,
        source: "welcome",
        once: true,
        request: options.request,
      });
      if (grant.applied) {
        void notifyWelcomeCredits({
          studentId: options.uid,
          credits: welcomeCredits,
          balance: grant.credits,
          request: options.request,
        });
      }
    }
    await ensureStudentReferralCode(options.uid);

    const referral = options.student?.referralCode?.trim();
    if (referral) {
      const referralResult = await applyReferralCode({
        studentId: options.uid,
        code: referral,
      });
      if (!referralResult.ok) {
        referralWarning = referralResult.error;
      }
    }
  }

  return { referralWarning };
}

/** Delete Auth user after a failed Firestore provision (best-effort). */
export async function rollbackAuthUser(uid: string): Promise<void> {
  try {
    await adminAuth.deleteUser(uid);
  } catch (error) {
    logger.error("register_auth_rollback_failed", {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
