import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { computeMatchScore, scoreWithBreakdown } from "@/lib/matching/score";
import { matchDocId } from "@/lib/matching/recompute";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { getProgramLevers } from "@/lib/collections/pages";
import {
  anonymizedDisplayName,
  anonymizedSearchHaystack,
  projectStudentForEmployer,
} from "@/lib/employer/student-visibility";

function canBrowsePool(session: NonNullable<Awaited<ReturnType<typeof getEmployerSession>>>) {
  return (
    session.company.plan === "track_a" &&
    session.company.subscriptionStatus === "active"
  );
}

/** Track A self-serve: list active students not already matched to this company. */
export async function GET(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  if (!canBrowsePool(session)) {
    return NextResponse.json(
      { error: "track_a_required", rows: [] },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const sector = searchParams.get("sector") ?? "";
  const location = searchParams.get("location") ?? "";

  try {
    const [studentsSnap, matchesSnap] = await Promise.all([
      adminDb.collection("students").where("status", "==", "active").get(),
      adminDb
        .collection("matches")
        .where("companyId", "==", session.companyId)
        .get(),
    ]);

    const matchedStudentIds = new Set(
      matchesSnap.docs.map((doc) => String(doc.data().studentId ?? "")),
    );

    const rows = [];

    for (const doc of studentsSnap.docs) {
      if (matchedStudentIds.has(doc.id)) continue;
      const student = doc.data();

      if (sector && student.sector !== sector) continue;
      if (location && student.currentCity !== location) continue;

      if (search) {
        const haystack = anonymizedSearchHaystack({ id: doc.id, ...student });
        if (!haystack.includes(search)) continue;
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
      const matchScore = breakdown.total;

      const projected = projectStudentForEmployer(
        { id: doc.id, ...student },
        { identityUnlocked: false, unlockRequestStatus: "none" },
      );

      rows.push({
        studentId: doc.id,
        displayName: projected.displayName,
        fullName: projected.displayName,
        identityUnlocked: false,
        unlockRequestStatus: "none" as const,
        sector: projected.sector,
        seniority: projected.seniority,
        currentCity: projected.currentCity,
        skills: projected.skills.slice(0, 3),
        matchScore,
        matchBreakdown: {
          total: breakdown.total,
          skills: breakdown.skills,
          location: breakdown.location,
          completeness: breakdown.completeness,
          reasons: breakdown.reasons,
        },
        candidateLabel: anonymizedDisplayName(doc.id),
      });
    }

    rows.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ rows, canBrowse: true });
  } catch (error) {
    console.error("talent_browse_failed", error);
    return NextResponse.json({ rows: [], canBrowse: true });
  }
}

const openSchema = z.object({
  studentId: z.string().min(1),
});

/** Create a company_browsed match so the candidate enters the company's pool (identity still locked). */
export async function POST(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  if (!canBrowsePool(session)) {
    return NextResponse.json({ error: "track_a_required" }, { status: 403 });
  }

  try {
    const { studentId } = openSchema.parse(await request.json());

    const [studentSnap, existingSnap, stagesSnap] = await Promise.all([
      adminDb.collection("students").doc(studentId).get(),
      adminDb
        .collection("matches")
        .where("companyId", "==", session.companyId)
        .where("studentId", "==", studentId)
        .limit(1)
        .get(),
      adminDb.collection("pipeline_stages").orderBy("order", "asc").limit(1).get(),
    ]);

    if (!studentSnap.exists || studentSnap.data()?.status !== "active") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const matchId = matchDocId(session.companyId, studentId);
    const existingById = await adminDb.collection("matches").doc(matchId).get();
    if (existingById.exists) {
      return NextResponse.json({
        matchId,
        alreadyExists: true,
      });
    }

    if (!existingSnap.empty) {
      return NextResponse.json({
        matchId: existingSnap.docs[0]!.id,
        alreadyExists: true,
      });
    }

    const stageId = stagesSnap.docs[0]?.id ?? "pipeline_new_match";
    const student = studentSnap.data()!;
    const matchScore = computeMatchScore({
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

    const levers = await getProgramLevers();
    const matchFeeEur = Number(levers?.trackAMatchFee ?? 200);

    const matchRef = adminDb.collection("matches").doc(matchId);
    await matchRef.set(
      stripUndefined({
        id: matchId,
        companyId: session.companyId,
        studentId,
        stageId,
        shortlisted: false,
        matchScore,
        source: "company_browsed",
        identityUnlocked: false,
        notes: [],
        viewedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    // Phase 5 autonomy: identity unlock / match_access self-serve remains deferred —
    // employers still request unlock; admin approval grants access (no one-liner flip).
    // match_access is deferred until admin approves a profile unlock.

    if (matchFeeEur > 0) {
      const feeRef = adminDb.collection("requests").doc();
      await feeRef.set(
        stripUndefined({
          id: feeRef.id,
          type: "match_fee",
          companyId: session.companyId,
          matchId,
          studentId,
          payload: {
            matchId,
            matchFeeEur,
            plan: "track_a",
            companyName: session.company.name,
            studentId,
          },
          status: "pending",
          createdAt: FieldValue.serverTimestamp(),
        }),
      );
    }

    return NextResponse.json({ matchId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("talent_browse_open_failed", error);
    return NextResponse.json({ error: "open_failed" }, { status: 500 });
  }
}
