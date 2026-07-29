import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import {
  companyProfileSchema,
  registrationProfileRefine,
  rollbackAuthUser,
  studentProfileSchema,
  writeRegistrationDocuments,
} from "@/lib/auth/registration";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

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
  .superRefine(registrationProfileRefine);

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

    let createdUid: string | null = null;

    try {
      const body = registerSchema.parse(await request.json());
      const email = body.email.trim().toLowerCase();
      const displayName =
        body.role === "student"
          ? body.student!.fullName
          : body.company!.contactName;
      const phoneRaw =
        body.role === "student"
          ? body.student!.phone?.trim() || null
          : body.company!.phone?.trim() || null;

      const userRecord = await adminAuth.createUser({
        email,
        password: body.password,
        displayName,
      });
      createdUid = userRecord.uid;

      let referralWarning: string | undefined;
      try {
        const result = await writeRegistrationDocuments({
          uid: userRecord.uid,
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
        referralWarning = result.referralWarning;
      } catch (writeError) {
        await rollbackAuthUser(userRecord.uid);
        createdUid = null;
        throw writeError;
      }

      return NextResponse.json({
        uid: userRecord.uid,
        role: body.role,
        nextStep: "verify",
        ...(referralWarning ? { referralWarning } : {}),
      });
    } catch (error) {
      if (createdUid) {
        await rollbackAuthUser(createdUid);
      }

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
