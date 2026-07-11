import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/auth";
import { syncLinkedProfile } from "@/lib/auth/profile-sync";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

const schema = z.object({
  photoUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  cvUrl: z.string().url().nullable().optional(),
});

/**
 * Completes signup media step: student photo (required) or employer logo (required).
 * Marks users.profileComplete and mirrors URLs across linked docs.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());

    const { getVerificationStatus } = await import("@/lib/auth/verification");
    const verification = await getVerificationStatus(user.uid);
    if (!verification.emailVerified || !verification.phoneVerified) {
      return NextResponse.json(
        { error: "verification_required" },
        { status: 403 },
      );
    }

    if (user.role === "student") {
      if (!body.photoUrl) {
        return NextResponse.json({ error: "photo_required" }, { status: 400 });
      }

      await adminDb
        .collection("students")
        .doc(user.uid)
        .update(
          stripUndefined({
            photoUrl: body.photoUrl,
            cvUrl: body.cvUrl === undefined ? undefined : body.cvUrl,
            updatedAt: FieldValue.serverTimestamp(),
          }),
        );

      await syncLinkedProfile({
        uid: user.uid,
        role: "student",
        photoUrl: body.photoUrl,
      });
    } else if (user.role === "company") {
      if (!body.logoUrl) {
        return NextResponse.json({ error: "logo_required" }, { status: 400 });
      }

      await adminDb
        .collection("companies")
        .doc(user.uid)
        .update(
          stripUndefined({
            logoUrl: body.logoUrl,
            updatedAt: FieldValue.serverTimestamp(),
          }),
        );

      await syncLinkedProfile({
        uid: user.uid,
        role: "company",
        photoUrl: body.logoUrl,
      });
    } else {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await adminDb.collection("users").doc(user.uid).update(
      stripUndefined({
        profileComplete: true,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    const { notifyWelcome } = await import("@/lib/email/notify");
    void notifyWelcome({
      userId: user.uid,
      role: user.role,
      request,
    });

    return NextResponse.json({ ok: true, profileComplete: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "complete_failed" }, { status: 500 });
  }
}
