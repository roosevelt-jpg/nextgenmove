import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import {
  anonymizedSearchHaystack,
  isMatchIdentityUnlocked,
  projectStudentForEmployer,
} from "@/lib/employer/student-visibility";
import { getUnlockRequestStatusMap } from "@/lib/employer/profile-unlock";
import { scoreWithBreakdown } from "@/lib/matching/score";

const TALENT_POOL_SOURCES = [
  "admin_curated",
  "company_browsed",
  "role_interest_promoted",
] as const;

export async function GET(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector") ?? "";
  const seniority = searchParams.get("seniority") ?? "";
  const location = searchParams.get("location") ?? "";
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();

  try {
    const matchesSnapshot = await adminDb
      .collection("matches")
      .where("companyId", "==", session.companyId)
      .where("source", "in", [...TALENT_POOL_SOURCES])
      .get();

    const studentIds = matchesSnapshot.docs.map((doc) =>
      String(doc.data().studentId ?? ""),
    );
    const unlockStatusMap = await getUnlockRequestStatusMap(
      session.companyId,
      studentIds.filter(Boolean),
    );

    const companyScoreInput = {
      industry: session.company.industry ?? "",
      preferredLocations: session.company.preferredLocations ?? [],
      requirementTags: session.company.requirementTags ?? [],
    };

    const rows = [];

    for (const matchDoc of matchesSnapshot.docs) {
      const match = matchDoc.data();
      const studentId = String(match.studentId ?? "");
      const studentSnapshot = await adminDb
        .collection("students")
        .doc(studentId)
        .get();

      if (!studentSnapshot.exists) {
        continue;
      }

      const student = studentSnapshot.data()!;
      const identityUnlocked = isMatchIdentityUnlocked(match);
      const unlockRequestStatus =
        unlockStatusMap.get(studentId) ?? (identityUnlocked ? "approved" : "none");

      if (sector && student.sector !== sector) {
        continue;
      }

      if (seniority && student.seniority !== seniority) {
        continue;
      }

      if (location && student.currentCity !== location) {
        continue;
      }

      if (search) {
        const haystack = identityUnlocked
          ? [
              student.fullName,
              student.email,
              student.currentCity,
              student.sector,
              ...(student.skills ?? []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
          : anonymizedSearchHaystack({ id: studentId, ...student });

        if (!haystack.includes(search)) {
          continue;
        }
      }

      const projected = projectStudentForEmployer(
        { id: studentSnapshot.id, ...student },
        { identityUnlocked, unlockRequestStatus },
      );

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
        company: companyScoreInput,
      });

      const storedScore =
        typeof match.matchScore === "number" ? match.matchScore : null;
      const matchScore = storedScore ?? breakdown.total;

      rows.push({
        matchId: matchDoc.id,
        shortlisted: Boolean(match.shortlisted),
        stageId: match.stageId ?? "",
        matchScore,
        matchBreakdown: {
          total: breakdown.total,
          skills: breakdown.skills,
          location: breakdown.location,
          completeness: breakdown.completeness,
          reasons: breakdown.reasons,
        },
        studentId: projected.id,
        identityUnlocked: projected.identityUnlocked,
        unlockRequestStatus: projected.unlockRequestStatus,
        displayName: projected.displayName,
        fullName: projected.displayName,
        email: projected.email,
        sector: projected.sector,
        seniority: projected.seniority,
        currentCity: projected.currentCity,
        skills: projected.skills,
        availability: projected.availability,
        bio: projected.bio,
      });
    }

    rows.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("talent_pool_failed", error);
    return NextResponse.json({ rows: [] });
  }
}
