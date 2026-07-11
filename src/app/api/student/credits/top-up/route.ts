import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getProgramLevers } from "@/lib/collections/pages";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const levers = await getProgramLevers();
  return NextResponse.json({
    packages: levers?.creditTopUpPackages ?? [],
    creditsPerEuro: levers?.creditsPerEuro ?? 4,
    placementFeeEur: levers?.placementFeeEur ?? 350,
  });
}

const requestSchema = z.object({
  packageId: z.string().min(1),
});

/** Credit top-ups go through admin approval (no Stripe in v1). */
export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  try {
    const { packageId } = requestSchema.parse(await request.json());
    const levers = await getProgramLevers();
    const pack = (levers?.creditTopUpPackages ?? []).find(
      (item) => item.id === packageId,
    );

    if (!pack) {
      return NextResponse.json({ error: "invalid_package" }, { status: 400 });
    }

    const requestRef = adminDb.collection("requests").doc();
    await requestRef.set(
      stripUndefined({
        id: requestRef.id,
        type: "credit_topup",
        studentId: session.studentId,
        companyId: null,
        payload: {
          packageId: pack.id,
          label: pack.label,
          credits: pack.credits,
          priceEur: pack.priceEur,
          studentName: session.student.fullName,
          studentEmail: session.student.email,
        },
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    return NextResponse.json({ id: requestRef.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("credit_topup_request_failed", error);
    return NextResponse.json({ error: "request_failed" }, { status: 500 });
  }
}
