import { NextResponse } from "next/server";
import { z } from "zod";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import {
  getUnlockRequestStatusMap,
  PROFILE_UNLOCK_TYPE,
} from "@/lib/employer/profile-unlock";
import {
  employerUnlockStudent,
  isStudentIdentityUnlocked,
} from "@/lib/marketplace/mutual-unlock";
import { adminDb } from "@/lib/firebase-admin";

const postSchema = z
  .object({
    studentId: z.string().min(1).optional(),
    matchId: z.string().min(1).optional(),
    mode: z.enum(["request", "credits"]).optional(),
  })
  .refine((body) => Boolean(body.studentId || body.matchId), {
    message: "studentId_or_matchId_required",
  });

export async function GET() {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  try {
    const snap = await adminDb
      .collection("requests")
      .where("type", "==", PROFILE_UNLOCK_TYPE)
      .where("companyId", "==", session.companyId)
      .get();

    const items = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        studentId: String(data.studentId ?? ""),
        matchId: data.matchId ? String(data.matchId) : null,
        status: String(data.status ?? "pending"),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        resolvedAt: data.resolvedAt?.toDate?.()?.toISOString?.() ?? null,
        candidateLabel:
          data.payload?.candidateLabel ?? null,
      };
    });

    items.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("employer_unlock_requests_list_failed", error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const body = postSchema.parse(await request.json());
    let studentId = body.studentId ?? "";
    let matchId = body.matchId ?? null;

    if (matchId) {
      const matchSnap = await adminDb.collection("matches").doc(matchId).get();
      if (!matchSnap.exists || matchSnap.data()?.companyId !== session.companyId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      const match = matchSnap.data()!;
      if (isStudentIdentityUnlocked(match)) {
        return NextResponse.json({ error: "already_unlocked" }, { status: 409 });
      }
      studentId = String(match.studentId ?? "");
    } else if (studentId) {
      const matchSnap = await adminDb
        .collection("matches")
        .where("companyId", "==", session.companyId)
        .where("studentId", "==", studentId)
        .limit(1)
        .get();
      if (!matchSnap.empty) {
        matchId = matchSnap.docs[0]!.id;
        if (isStudentIdentityUnlocked(matchSnap.docs[0]!.data())) {
          return NextResponse.json({ error: "already_unlocked" }, { status: 409 });
        }
      }
    }

    if (!studentId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const mode = body.mode ?? "request";

    const result = await employerUnlockStudent({
      mode,
      companyId: session.companyId,
      companyName: session.company.name,
      studentId,
      matchId,
      actorUid: session.user.uid,
      request,
    });

    if (mode === "credits") {
      return NextResponse.json({
        matchId: result.matchId,
        mode: "credits",
        paid: result.paid ?? false,
        creditsSpent: result.creditsSpent ?? 0,
        unlockRequestStatus: result.unlockRequestStatus,
        identityUnlocked: true,
      });
    }

    const statusMap = await getUnlockRequestStatusMap(session.companyId, [
      studentId,
    ]);

    return NextResponse.json({
      id: result.id,
      alreadyPending: result.alreadyPending,
      mode: "request",
      unlockRequestStatus: statusMap.get(studentId) ?? "pending",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "student_not_found" || error.message === "not_found") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (error.message === "credits_disabled") {
        return NextResponse.json({ error: "credits_disabled" }, { status: 400 });
      }
      if (error.message === "insufficient_company_credits") {
        return NextResponse.json(
          { error: "insufficient_credits" },
          { status: 402 },
        );
      }
    }
    console.error("employer_unlock_request_failed", error);
    return NextResponse.json({ error: "request_failed" }, { status: 500 });
  }
}
