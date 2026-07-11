import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta, getWayToEarnCredits } from "@/lib/credits/ledger";
import { ensureStudentReferralCode } from "@/lib/credits/referrals";
import { stripUndefined } from "@/lib/stripUndefined";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["company", "student"]),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const displayName = body.displayName?.trim() ?? "";

    const userRecord = await adminAuth.createUser({
      email: body.email,
      password: body.password,
      displayName: displayName || undefined,
    });

    const uid = userRecord.uid;
    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();

    batch.set(
      adminDb.collection("users").doc(uid),
      stripUndefined({
        uid,
        email: body.email,
        role: body.role,
        displayName,
        photoUrl: null,
        createdAt: now,
        lastLoginAt: null,
        status: "active",
      }),
    );

    if (body.role === "company") {
      batch.set(
        adminDb.collection("companies").doc(uid),
        stripUndefined({
          id: uid,
          userId: uid,
          name: displayName,
          contactEmail: body.email,
          logoUrl: null,
          industry: "",
          website: null,
          plan: null,
          subscriptionStatus: "pending",
          requirements: [],
          preferredLocations: [],
          requirementTags: [],
          createdAt: now,
        }),
      );
    }

    if (body.role === "student") {
      batch.set(
        adminDb.collection("students").doc(uid),
        stripUndefined({
          id: uid,
          userId: uid,
          fullName: displayName,
          email: body.email,
          photoUrl: null,
          sector: "",
          seniority: "",
          currentCity: "",
          targetCities: [],
          cvUrl: null,
          linkedinUrl: null,
          portfolioUrl: null,
          bio: "",
          skills: [],
          availability: "",
          credits: 0,
          status: "active",
          createdAt: now,
        }),
      );
    }

    await batch.commit();

    if (body.role === "student") {
      const welcomeCredits = await getWayToEarnCredits("welcome");
      if (welcomeCredits > 0) {
        await applyCreditDelta({
          studentId: uid,
          amount: welcomeCredits,
          source: "welcome",
          once: true,
        });
      }
      await ensureStudentReferralCode(uid);
    }

    return NextResponse.json({ uid });
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

    console.error("register_failed", error);
    return NextResponse.json({ error: "register_failed" }, { status: 500 });
  }
}
