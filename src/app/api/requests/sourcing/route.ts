import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

const sourcingSchema = z.object({
  companyName: z.string().trim().min(1),
  contactName: z.string().trim().min(1),
  workEmail: z.string().email(),
  phone: z.string().trim().optional().nullable(),
  roleTitleNeeded: z.string().trim().min(1),
  sector: z.string().trim().min(1),
  location: z.string().trim().min(1),
  numberOfHires: z.number().int().positive(),
  preferredTrack: z.string().trim().min(1),
  timeline: z.string().trim().min(1),
  additionalRequirements: z.string().trim().optional().nullable(),
  jobDescriptionFileUrl: z.string().url().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = sourcingSchema.parse(await request.json());
    const requestRef = adminDb.collection("requests").doc();

    await requestRef.set(
      stripUndefined({
        id: requestRef.id,
        type: "sourcing_request",
        companyId: null,
        payload: {
          companyName: body.companyName,
          contactName: body.contactName,
          workEmail: body.workEmail,
          phone: body.phone ?? null,
          roleTitleNeeded: body.roleTitleNeeded,
          sector: body.sector,
          location: body.location,
          numberOfHires: body.numberOfHires,
          preferredTrack: body.preferredTrack,
          timeline: body.timeline,
          additionalRequirements: body.additionalRequirements ?? null,
          jobDescriptionFileUrl: body.jobDescriptionFileUrl ?? null,
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

    console.error("sourcing_request_failed", error);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}
