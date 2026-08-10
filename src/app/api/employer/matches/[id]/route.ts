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
import {
  isMatchIdentityUnlocked,
  projectStudentForEmployer,
} from "@/lib/employer/student-visibility";
import { getUnlockRequestStatus } from "@/lib/employer/profile-unlock";
import { logPiiAccess } from "@/lib/security/pii-access-log";
import { scoreWithBreakdown } from "@/lib/matching/score";
import { getProfileUnlockCreditCost } from "@/lib/marketplace/mutual-unlock";

const patchSchema = z.object({
  shortlisted: z.boolean().optional(),
  stageId: z.string().min(1).optional(),
  action: z
    .enum(["hire", "reject", "schedule_interview", "submit_scorecard"])
    .optional(),
  interviewAt: z.string().datetime().optional(),
  applicationStatus: z
    .enum(["pending", "interviewing", "hired", "rejected"])
    .optional(),
  scorecard: z
    .object({
      criteria: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(120),
            score: z.number().int().min(1).max(5),
          }),
        )
        .min(1)
        .max(12),
      notes: z.string().trim().max(2000).optional().nullable(),
      recommendation: z.enum(["advance", "hold", "reject"]),
    })
    .optional(),
});

function serializeInterviewAt(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

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

  const studentId = String(match.studentId);
  const studentSnap = await adminDb.collection("students").doc(studentId).get();

  if (!studentSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const student = studentSnap.data()!;
  const identityUnlocked = isMatchIdentityUnlocked(match);
  const unlockRequestStatus = await getUnlockRequestStatus(
    session.companyId,
    studentId,
  );

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

  const projected = projectStudentForEmployer(
    { id: studentSnap.id, ...student },
    {
      identityUnlocked,
      unlockRequestStatus: identityUnlocked ? "approved" : unlockRequestStatus,
    },
  );

  if (identityUnlocked) {
    void logPiiAccess({
      actorUid: session.user.uid,
      studentId,
      action: "unlock_view",
      meta: {
        matchId: id,
        companyId: session.companyId,
        route: "employer_match_get",
      },
    });
  }

  const breakdown = scoreWithBreakdown({
    student: {
      fullName: student.fullName ?? "",
      sector: student.sector ?? "",
      seniority: student.seniority ?? "",
      currentCity: student.currentCity ?? "",
      targetCities: student.targetCities ?? [],
      bio: student.bio ?? "",
      skills: student.skills ?? [],
      availability: student.availability ?? "",
      cvUrl: student.cvUrl ?? null,
      linkedinUrl: student.linkedinUrl ?? null,
      portfolioUrl: student.portfolioUrl ?? null,
      photoUrl: student.photoUrl ?? null,
    },
    company: {
      industry: session.company.industry ?? "",
      preferredLocations: session.company.preferredLocations ?? [],
      requirementTags: session.company.requirementTags ?? [],
    },
  });
  const storedScore =
    typeof match.matchScore === "number" ? match.matchScore : null;

  const profileUnlockCreditCost = await getProfileUnlockCreditCost();
  const creditsUnlockAvailable =
    !identityUnlocked && profileUnlockCreditCost > 0;

  return NextResponse.json({
    match: {
      id,
      stageId: String(match.stageId ?? ""),
      shortlisted: Boolean(match.shortlisted),
      matchScore: storedScore ?? breakdown.total,
      matchBreakdown: {
        total: breakdown.total,
        skills: breakdown.skills,
        location: breakdown.location,
        completeness: breakdown.completeness,
        reasons: breakdown.reasons,
      },
      identityUnlocked,
      unlockRequestStatus: projected.unlockRequestStatus,
      creditsUnlockAvailable,
      unlockModes: creditsUnlockAvailable
        ? ["request", "credits"]
        : ["request"],
      notes: match.notes ?? [],
      interviewAt: serializeInterviewAt(match.interviewAt),
      applicationStatus: match.applicationStatus
        ? String(match.applicationStatus)
        : null,
      interviewScorecard: match.interviewScorecard ?? null,
    },
    student: {
      id: projected.id,
      displayName: projected.displayName,
      fullName: projected.displayName,
      identityUnlocked: projected.identityUnlocked,
      unlockRequestStatus: projected.unlockRequestStatus,
      creditsUnlockAvailable,
      unlockModes: creditsUnlockAvailable
        ? ["request", "credits"]
        : ["request"],
      email: projected.email,
      phone: projected.phone,
      sector: projected.sector,
      seniority: projected.seniority,
      currentCity: projected.currentCity,
      targetCities: projected.targetCities,
      skills: projected.skills,
      bio: projected.bio,
      availability: projected.availability,
      linkedinUrl: projected.linkedinUrl,
      portfolioUrl: projected.portfolioUrl,
      cvUrl: projected.cvUrl,
      photoUrl: projected.photoUrl,
      workExperience: projected.workExperience,
      workExperienceEntries: projected.workExperienceEntries,
      education: projected.education,
      assessment: projected.assessment,
      githubUrl: projected.githubUrl,
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

    const identityUnlocked = isMatchIdentityUnlocked(match);
    // Interview / hire / scorecard require NGM-approved identity unlock (server-enforced).
    if (
      (body.action === "hire" ||
        body.action === "schedule_interview" ||
        body.action === "submit_scorecard") &&
      !identityUnlocked
    ) {
      return NextResponse.json(
        { error: "identity_locked" },
        { status: 403 },
      );
    }

    if (body.action === "submit_scorecard") {
      if (!body.scorecard) {
        return NextResponse.json({ error: "scorecard_required" }, { status: 400 });
      }
      if (!match.interviewAt && match.applicationStatus !== "interviewing") {
        return NextResponse.json(
          { error: "interview_not_scheduled" },
          { status: 400 },
        );
      }

      const interviewScorecard = stripUndefined({
        criteria: body.scorecard.criteria,
        notes: body.scorecard.notes ?? null,
        recommendation: body.scorecard.recommendation,
        submittedAt: new Date().toISOString(),
        submittedBy: session.user.uid,
      });

      const stages = await adminDb.collection("pipeline_stages").get();
      const stageDocs = stages.docs.map((d) => ({
        id: d.id,
        name: String(d.data()?.name ?? ""),
        isTerminal: Boolean(d.data()?.isTerminal),
      }));

      let suggestedStageId: string | null = null;
      let suggestedStageName: string | null = null;
      if (body.scorecard.recommendation === "advance") {
        const offer = stageDocs.find((s) =>
          /offer|advance|hired|placed/i.test(s.name),
        );
        if (offer) {
          suggestedStageId = offer.id;
          suggestedStageName = offer.name;
        }
      } else if (body.scorecard.recommendation === "reject") {
        const rejected = stageDocs.find((s) => /reject|declin/i.test(s.name));
        if (rejected) {
          suggestedStageId = rejected.id;
          suggestedStageName = rejected.name || "Rejected";
        } else {
          suggestedStageName = "Rejected";
        }
      } else {
        suggestedStageName = "Hold";
      }

      await adminDb
        .collection("matches")
        .doc(id)
        .update(
          stripUndefined({
            interviewScorecard,
            updatedAt: FieldValue.serverTimestamp(),
          }),
        );

      const { notifyMatchUpdate } = await import("@/lib/email/notify");
      void notifyMatchUpdate({
        studentId: String(match.studentId),
        stageName: "Interview update",
      });

      const { createNotification } = await import("@/lib/notifications/create");
      void createNotification({
        userId: String(match.studentId),
        type: "match_update",
        title: "Interview update",
        body: "Your application has an interview update from the employer.",
        link: "/student/applications",
      });

      return NextResponse.json({
        ok: true,
        interviewScorecard,
        suggestedStageId,
        suggestedStageName,
      });
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

    let calendarEventId: string | null = null;
    let calendarEventLink: string | null = null;
    if (body.action === "schedule_interview" && body.interviewAt) {
      try {
        const [{ createInterviewCalendarEvent }, studentSnap, companySnap] =
          await Promise.all([
            import("@/lib/calendar/google-calendar"),
            adminDb.collection("students").doc(String(match.studentId)).get(),
            adminDb.collection("companies").doc(String(match.companyId)).get(),
          ]);
        const studentEmail = String(studentSnap.data()?.email ?? "").trim();
        const companyEmail = String(
          companySnap.data()?.contactEmail ?? "",
        ).trim();
        const studentName = String(
          studentSnap.data()?.fullName ?? "Candidate",
        );
        const companyName = String(companySnap.data()?.name ?? "Company");
        const created = await createInterviewCalendarEvent({
          summary: `Interview · ${studentName} × ${companyName}`,
          description: `NextGenMove interview between ${studentName} and ${companyName}.`,
          startIso: body.interviewAt,
          attendeeEmails: [studentEmail, companyEmail].filter(Boolean),
        });
        if (created) {
          calendarEventId = created.eventId;
          calendarEventLink = created.htmlLink;
        }
      } catch (calendarError) {
        console.error("schedule_interview_calendar_failed", calendarError);
      }
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
          ...(body.action === "hire"
            ? { hiredAt: FieldValue.serverTimestamp() }
            : {}),
          ...(body.action === "schedule_interview" && body.interviewAt
            ? { interviewAt: new Date(body.interviewAt) }
            : {}),
          ...(calendarEventId ? { googleCalendarEventId: calendarEventId } : {}),
          ...(calendarEventLink
            ? { googleCalendarEventLink: calendarEventLink }
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
      try {
        const { ensureMoveItinerary } = await import("@/lib/move-os/itinerary");
        await ensureMoveItinerary({
          matchId: id,
          studentId: String(match.studentId),
          companyId: session.companyId,
        });
      } catch (moveOsError) {
        console.error("hire_ensure_move_itinerary_failed", moveOsError);
      }

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
