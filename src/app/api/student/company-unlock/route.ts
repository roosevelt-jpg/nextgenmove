import { NextResponse } from "next/server";
import { z } from "zod";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import { adminDb } from "@/lib/firebase-admin";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";
import { isStudentInitiatedMatch } from "@/lib/employer/student-visibility";
import {
  getCompanyUnlockRequestStatus,
  isCompanyIdentityUnlocked,
  purchaseCompanyUnlock,
  requestCompanyUnlock,
} from "@/lib/marketplace/mutual-unlock";

const postSchema = z
  .object({
    matchId: z.string().min(1).optional(),
    jobPostingId: z.string().min(1).optional(),
    mode: z.enum(["request", "credits"]).optional(),
  })
  .refine((body) => Boolean(body.matchId || body.jobPostingId), {
    message: "matchId_or_jobPostingId_required",
  });

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const body = postSchema.parse(await request.json());
    let matchId = body.matchId ?? "";
    let matchData: Record<string, unknown> | undefined;

    if (matchId) {
      const snap = await adminDb.collection("matches").doc(matchId).get();
      if (!snap.exists || snap.data()?.studentId !== session.studentId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      matchData = snap.data() as Record<string, unknown>;
      if (!isStudentInitiatedMatch(matchData ?? {})) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    } else if (body.jobPostingId) {
      const snap = await adminDb
        .collection("matches")
        .where("studentId", "==", session.studentId)
        .where("jobPostingId", "==", body.jobPostingId)
        .limit(1)
        .get();
      if (snap.empty) {
        return NextResponse.json({ error: "not_applied" }, { status: 400 });
      }
      matchId = snap.docs[0]!.id;
      matchData = snap.docs[0]!.data() as Record<string, unknown>;
      if (!isStudentInitiatedMatch(matchData ?? {})) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    if (!matchId || !matchData) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    if (isCompanyIdentityUnlocked(matchData)) {
      return NextResponse.json({
        matchId,
        companyUnlockStatus: "approved",
        companyIdentityUnlocked: true,
      });
    }

    const mode = body.mode ?? "request";

    if (mode === "credits") {
      const result = await purchaseCompanyUnlock({
        studentId: session.studentId,
        matchId,
        actorUid: session.user.uid,
        request,
      });
      return NextResponse.json({
        matchId: result.matchId,
        mode: "credits",
        paid: result.paid,
        creditsSpent: result.creditsSpent,
        companyUnlockStatus: result.companyUnlockStatus,
        companyIdentityUnlocked: true,
      });
    }

    const result = await requestCompanyUnlock({
      studentId: session.studentId,
      matchId,
      request,
    });
    const companyUnlockStatus = await getCompanyUnlockRequestStatus(
      session.studentId,
      matchId,
    );

    return NextResponse.json({
      id: result.id,
      matchId,
      alreadyPending: result.alreadyPending,
      mode: "request",
      companyUnlockStatus:
        companyUnlockStatus === "none" ? "pending" : companyUnlockStatus,
      companyIdentityUnlocked: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "not_found") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (error.message === "forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message === "already_unlocked") {
        return NextResponse.json({ error: "already_unlocked" }, { status: 409 });
      }
      if (error.message === "credits_disabled") {
        return NextResponse.json({ error: "credits_disabled" }, { status: 400 });
      }
      if (error.message === "insufficient_credits") {
        return NextResponse.json(
          { error: "insufficient_credits" },
          { status: 402 },
        );
      }
    }
    console.error("student_company_unlock_failed", error);
    return NextResponse.json({ error: "request_failed" }, { status: 500 });
  }
}
