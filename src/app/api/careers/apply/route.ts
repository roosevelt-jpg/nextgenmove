import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

const applySchema = z.object({
  jobPostingId: z.string().min(1).nullable().optional(),
  isGeneral: z.boolean().optional(),
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  linkedinUrl: z.string().trim().optional().nullable(),
  cvUrl: z.string().url(),
  coverNote: z.string().trim().min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const body = applySchema.parse(await request.json());
    const isGeneral = Boolean(body.isGeneral) || !body.jobPostingId;

    if (!isGeneral && body.jobPostingId) {
      const jobSnapshot = await adminDb
        .collection("job_postings")
        .doc(body.jobPostingId)
        .get();

      if (!jobSnapshot.exists || jobSnapshot.data()?.status !== "open") {
        return NextResponse.json({ error: "job_not_found" }, { status: 404 });
      }
    }

    const applicationRef = adminDb.collection("job_applications").doc();

    await applicationRef.set(
      stripUndefined({
        id: applicationRef.id,
        jobPostingId: isGeneral ? null : body.jobPostingId,
        isGeneral,
        fullName: body.fullName,
        email: body.email,
        linkedinUrl: body.linkedinUrl ?? null,
        cvUrl: body.cvUrl,
        coverNote: body.coverNote,
        status: "new",
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    return NextResponse.json({ id: applicationRef.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("careers_apply_failed", error);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}
