import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  forbiddenResponse,
  getEmployerSession,
  unauthorizedResponse,
  verifyMatchOwnership,
} from "@/lib/employer/session";

const patchSchema = z.object({
  shortlisted: z.boolean().optional(),
  stageId: z.string().min(1).optional(),
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

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const match = await verifyMatchOwnership(id, session.companyId);

    if (!match) {
      return forbiddenResponse();
    }

    let stageIsTerminal = false;

    if (body.stageId) {
      const stageSnapshot = await adminDb
        .collection("pipeline_stages")
        .doc(body.stageId)
        .get();

      if (!stageSnapshot.exists) {
        return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
      }

      stageIsTerminal = Boolean(stageSnapshot.data()?.isTerminal);
    }

    await adminDb
      .collection("matches")
      .doc(id)
      .update(
        stripUndefined({
          ...(body.shortlisted !== undefined ? { shortlisted: body.shortlisted } : {}),
          ...(body.stageId ? { stageId: body.stageId } : {}),
          ...(body.shortlisted === true && match.shortlistRank == null
            ? { shortlistRank: Date.now() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

    // Placement fee tracking when a match reaches a terminal stage.
    if (body.stageId && stageIsTerminal) {
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
