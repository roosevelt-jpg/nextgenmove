import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

const planRequestSchema = z.object({
  requestedPlan: z.enum(["track_a", "track_b"]),
});

export async function POST(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { requestedPlan } = planRequestSchema.parse(await request.json());
    const requestRef = adminDb.collection("requests").doc();

    await requestRef.set(
      stripUndefined({
        id: requestRef.id,
        type: "plan_request",
        companyId: session.companyId,
        payload: {
          requestedPlan,
          currentPlan: session.company.plan,
          companyName: session.company.name,
          contactEmail: session.company.contactEmail,
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

    console.error("plan_request_failed", error);
    return NextResponse.json({ error: "request_failed" }, { status: 500 });
  }
}
