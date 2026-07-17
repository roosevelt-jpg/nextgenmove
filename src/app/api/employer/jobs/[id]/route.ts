import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

const jobSchema = z.object({
  title: z.string().trim().min(1).max(160),
  companyName: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().min(1).max(8000),
  location: z.string().trim().min(1).max(120),
  salary: z.string().trim().max(120).optional(),
  employmentType: z.enum(["full_time", "part_time", "internship", "freelance"]),
  gender: z.string().trim().max(40).optional(),
  categories: z.array(z.string().trim().min(1)).min(1).max(12),
  skills: z.array(z.string().trim().min(1)).max(40).optional(),
  postedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();
  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  const { id } = await context.params;
  const ref = adminDb.collection("job_postings").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.companyId !== session.companyId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const body = jobSchema.parse(await request.json());
    await ref.set(
      stripUndefined({
        companyName: body.companyName?.trim() || session.company.name,
        title: body.title,
        description: body.description,
        location: body.location,
        salary: body.salary?.trim() || "",
        employmentType: body.employmentType,
        gender: body.gender?.trim() || "",
        categories: body.categories,
        skills: body.skills ?? [],
        department: body.categories[0] ?? "",
        postedAt: body.postedAt ? new Date(body.postedAt) : snap.data()?.postedAt,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        // Re-submit for moderation after edits
        status: "pending",
        moderationStatus: "pending",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();
  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  const { id } = await context.params;
  const ref = adminDb.collection("job_postings").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.companyId !== session.companyId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await ref.delete();
  return NextResponse.json({ ok: true });
}
