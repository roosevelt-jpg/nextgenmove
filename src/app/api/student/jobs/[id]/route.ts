import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { createNotification } from "@/lib/notifications/create";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const { id } = await params;
  const snap = await adminDb.collection("job_postings").doc(id).get();
  if (!snap.exists || snap.data()?.status !== "open") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = snap.data()!;
  const existing = await adminDb
    .collection("matches")
    .where("studentId", "==", session.studentId)
    .where("jobPostingId", "==", id)
    .limit(1)
    .get();

  return NextResponse.json({
    job: {
      id: snap.id,
      title: String(data.title ?? ""),
      companyName: String(data.companyName ?? ""),
      companyId: String(data.companyId ?? ""),
      description: String(data.description ?? ""),
      location: String(data.location ?? ""),
      salary: String(data.salary ?? ""),
      employmentType: String(data.employmentType ?? ""),
      gender: String(data.gender ?? ""),
      categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
      postedAt: serializeTimestamp(data.postedAt ?? data.createdAt),
    },
    alreadyApplied: !existing.empty,
  });
}

const applySchema = z.object({
  action: z.literal("apply"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  const { id } = await params;

  try {
    applySchema.parse(await request.json());
    const jobSnap = await adminDb.collection("job_postings").doc(id).get();
    if (!jobSnap.exists || jobSnap.data()?.status !== "open") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const job = jobSnap.data()!;
    const companyId = String(job.companyId ?? "");
    if (!companyId) {
      return NextResponse.json({ error: "invalid_job" }, { status: 400 });
    }

    const existing = await adminDb
      .collection("matches")
      .where("studentId", "==", session.studentId)
      .where("jobPostingId", "==", id)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: "already_applied", id: existing.docs[0]!.id });
    }

    const stages = await adminDb.collection("pipeline_stages").orderBy("order").get().catch(
      () => adminDb.collection("pipeline_stages").get(),
    );
    const firstStage = stages.docs[0];
    const ref = adminDb.collection("matches").doc();
    await ref.set(
      stripUndefined({
        id: ref.id,
        studentId: session.studentId,
        companyId,
        jobPostingId: id,
        jobTitle: String(job.title ?? ""),
        stageId: firstStage?.id ?? "pipeline_new",
        shortlisted: false,
        applicationStatus: "pending",
        matchScore: null,
        notes: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await createNotification({
      userId: session.studentId,
      type: "application",
      title: "Application submitted",
      body: `You applied to ${String(job.title ?? "a role")}.`,
      link: "/student/applications",
    });

    // Notify company owner if present
    const companySnap = await adminDb.collection("companies").doc(companyId).get();
    const ownerId = String(companySnap.data()?.ownerId ?? companySnap.data()?.userId ?? "");
    if (ownerId) {
      await createNotification({
        userId: ownerId,
        type: "application",
        title: "New application",
        body: `${session.student.fullName || "A candidate"} applied to ${String(job.title ?? "your role")}.`,
        link: `/employer/candidates/${ref.id}`,
      });
    }

    return NextResponse.json({ id: ref.id, status: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("student_job_apply_failed", error);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}
