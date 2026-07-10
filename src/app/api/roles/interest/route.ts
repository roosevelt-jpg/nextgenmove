import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

const interestSchema = z.object({
  publicRoleId: z.string().min(1),
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  currentCity: z.string().trim().min(1),
  cvUrl: z.string().url(),
  whyThisRole: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = interestSchema.parse(await request.json());
    const roleSnapshot = await adminDb
      .collection("public_roles")
      .doc(body.publicRoleId)
      .get();

    if (!roleSnapshot.exists || roleSnapshot.data()?.status !== "open") {
      return NextResponse.json({ error: "role_not_found" }, { status: 404 });
    }

    const submissionRef = adminDb.collection("role_interest_submissions").doc();

    await submissionRef.set(
      stripUndefined({
        id: submissionRef.id,
        publicRoleId: body.publicRoleId,
        fullName: body.fullName,
        email: body.email,
        currentCity: body.currentCity,
        cvUrl: body.cvUrl,
        whyThisRole: body.whyThisRole,
        status: "new",
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    return NextResponse.json({ id: submissionRef.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("role_interest_failed", error);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}
