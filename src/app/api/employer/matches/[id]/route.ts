import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  forbiddenResponse,
  getEmployerSession,
  unauthorizedResponse,
  verifyMatchOwnership,
} from "@/lib/employer/session";

const patchSchema = z.object({
  shortlisted: z.boolean().optional(),
  stageId: z.string().min(1).optional(),
  action: z.enum(["hire", "reject", "schedule_interview"]).optional(),
  interviewAt: z.string().datetime().optional(),
  applicationStatus: z
    .enum(["pending", "interviewing", "hired", "rejected"])
    .optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const match = await verifyMatchOwnership(id, session.companyId);

  if (!match) {
    return forbiddenResponse();
  }

  const studentSnap = await adminDb
    .collection("students")
    .doc(String(match.studentId))
    .get();

  if (!studentSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const student = studentSnap.data()!;

  if (!match.viewedAt) {
    await adminDb
      .collection("matches")
      .doc(id)
      .update(
        stripUndefined({
          viewedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
  }

  return NextResponse.json({
    match: {
      id,
      stageId: String(match.stageId ?? ""),
      shortlisted: Boolean(match.shortlisted),
      matchScore: typeof match.matchScore === "number" ? match.matchScore : null,
      notes: match.notes ?? [],
    },
    student: {
      id: studentSnap.id,
      fullName: student.fullName ?? "",
      email: student.email ?? "",
      sector: student.sector ?? "",
      seniority: student.seniority ?? "",
      currentCity: student.currentCity ?? "",
      targetCities: student.targetCities ?? [],
      skills: student.skills ?? [],
      bio: student.bio ?? "",
      availability: student.availability ?? "",
      linkedinUrl: student.linkedinUrl ?? null,
      portfolioUrl: student.portfolioUrl ?? null,
      cvUrl: student.cvUrl ?? null,
      photoUrl: student.photoUrl ?? null,
      workExperience: student.workExperience ?? null,
      workExperienceEntries: student.workExperienceEntries ?? [],
      githubUrl: student.githubUrl ?? null,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const match = await verifyMatchOwnership(id, session.companyId);

    if (!match) {
      return forbiddenResponse();
    }

    let stageIsTerminal = false;
    let stageName = "";
    let nextStageId = body.stageId;
    let applicationStatus = body.applicationStatus;

    if (body.action === "hire") {
      applicationStatus = "hired";
      const stages = await adminDb.collection("pipeline_stages").get();
      const placed = stages.docs.find((d) => {
        const name = String(d.data()?.name ?? "").toLowerCase();
        return d.data()?.isTerminal || name.includes("placed") || name.includes("hired");
      });
      if (placed) nextStageId = placed.id;
      stageIsTerminal = true;
      stageName = String(placed?.data()?.name ?? "Hired");
    } else if (body.action === "reject") {
      applicationStatus = "rejected";
      stageName = "Rejected";
    } else if (body.action === "schedule_interview") {
      applicationStatus = "interviewing";
      if (!body.interviewAt) {
        return NextResponse.json({ error: "interview_at_required" }, { status: 400 });
      }
      const stages = await adminDb.collection("pipeline_stages").get();
      const interview = stages.docs.find((d) =>
        String(d.data()?.name ?? "")
          .toLowerCase()
          .includes("interview"),
      );
      if (interview) nextStageId = interview.id;
      stageName = String(interview?.data()?.name ?? "Interviewing");
    }

    if (nextStageId && !stageName) {
      const stageSnapshot = await adminDb
        .collection("pipeline_stages")
        .doc(nextStageId)
        .get();

      if (!stageSnapshot.exists) {
        return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
      }

      stageIsTerminal = Boolean(stageSnapshot.data()?.isTerminal);
      stageName = String(stageSnapshot.data()?.name ?? nextStageId);
    }

    await adminDb
      .collection("matches")
      .doc(id)
      .update(
        stripUndefined({
          ...(body.shortlisted !== undefined ? { shortlisted: body.shortlisted } : {}),
          ...(nextStageId ? { stageId: nextStageId } : {}),
          ...(applicationStatus ? { applicationStatus } : {}),
          ...(body.action === "schedule_interview" && body.interviewAt
            ? { interviewAt: new Date(body.interviewAt) }
            : {}),
          ...(body.shortlisted === true && match.shortlistRank == null
            ? { shortlistRank: Date.now() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

    if ((nextStageId || body.action) && stageName) {
      const { notifyMatchUpdate } = await import("@/lib/email/notify");
      void notifyMatchUpdate({
        studentId: String(match.studentId),
        stageName:
          body.action === "schedule_interview" && body.interviewAt
            ? `${stageName} · ${new Date(body.interviewAt).toLocaleString()}`
            : stageName,
      });

      const { createNotification } = await import("@/lib/notifications/create");
      const notifType =
        body.action === "hire"
          ? "hire"
          : body.action === "reject"
            ? "reject"
            : body.action === "schedule_interview"
              ? "interview"
              : "match_update";
      void createNotification({
        userId: String(match.studentId),
        type: notifType,
        title: stageName,
        body:
          body.action === "schedule_interview" && body.interviewAt
            ? `Interview scheduled for ${new Date(body.interviewAt).toLocaleString()}.`
            : `Your application status is now: ${stageName}.`,
        link: "/student/applications",
      });
    }

    // Placement fee tracking when a match reaches a terminal stage.
    if (nextStageId && stageIsTerminal) {
      const leversSnap = await adminDb
        .collection("program_levers")
        .doc("default")
        .get();
      const placementFeeEur = Number(leversSnap.data()?.placementFeeEur ?? 350);
      const existingFee = await adminDb
        .collection("requests")
        .where("type", "==", "placement_fee")
        .where("matchId", "==", id)
        .limit(1)
        .get()
        .catch(() => null);

      if (!existingFee || existingFee.empty) {
        const feeRef = adminDb.collection("requests").doc();
        await feeRef.set(
          stripUndefined({
            id: feeRef.id,
            type: "placement_fee",
            matchId: id,
            companyId: session.companyId,
            studentId: match.studentId,
            payload: {
              matchId: id,
              placementFeeEur,
              companyName: session.company.name,
              studentId: match.studentId,
            },
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
          }),
        );

        await adminDb
          .collection("students")
          .doc(String(match.studentId))
          .update(
            stripUndefined({
              status: "placed",
              placementFeeEur,
              placementFeeStatus: "pending",
              updatedAt: FieldValue.serverTimestamp(),
            }),
          );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("match_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
