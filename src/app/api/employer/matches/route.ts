import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import {
  isMatchIdentityUnlocked,
  projectStudentForEmployer,
} from "@/lib/employer/student-visibility";
import { getUnlockRequestStatusMap } from "@/lib/employer/profile-unlock";

export async function GET(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const shortlistedOnly = searchParams.get("shortlisted") === "true";

  try {
    const matchesSnapshot = shortlistedOnly
      ? await adminDb
          .collection("matches")
          .where("companyId", "==", session.companyId)
          .where("shortlisted", "==", true)
          .get()
      : await adminDb
          .collection("matches")
          .where("companyId", "==", session.companyId)
          .get();

    const studentIds = matchesSnapshot.docs.map((doc) =>
      String(doc.data().studentId ?? ""),
    );
    const unlockStatusMap = await getUnlockRequestStatusMap(
      session.companyId,
      studentIds.filter(Boolean),
    );

    const matches = [];

    for (const matchDoc of matchesSnapshot.docs) {
      const match = matchDoc.data();
      const studentId = String(match.studentId ?? "");
      const studentSnapshot = await adminDb
        .collection("students")
        .doc(studentId)
        .get();

      const identityUnlocked = isMatchIdentityUnlocked(match);
      const unlockRequestStatus =
        unlockStatusMap.get(studentId) ?? (identityUnlocked ? "approved" : "none");

      const projected = studentSnapshot.exists
        ? projectStudentForEmployer(
            { id: studentSnapshot.id, ...studentSnapshot.data()! },
            { identityUnlocked, unlockRequestStatus },
          )
        : null;

      matches.push({
        id: matchDoc.id,
        companyId: match.companyId,
        studentId: match.studentId,
        stageId: match.stageId ?? "",
        shortlisted: Boolean(match.shortlisted),
        shortlistRank:
          typeof match.shortlistRank === "number" ? match.shortlistRank : null,
        matchScore:
          typeof match.matchScore === "number" ? match.matchScore : null,
        source: match.source ?? "",
        identityUnlocked,
        unlockRequestStatus,
        notes: match.notes ?? [],
        createdAt: match.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: match.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        student: projected
          ? {
              displayName: projected.displayName,
              fullName: projected.displayName,
              email: projected.email,
              sector: projected.sector,
              seniority: projected.seniority,
              currentCity: projected.currentCity,
              identityUnlocked: projected.identityUnlocked,
              unlockRequestStatus: projected.unlockRequestStatus,
            }
          : null,
      });
    }

    if (shortlistedOnly) {
      matches.sort((a, b) => {
        const aRank = a.shortlistRank ?? Number.MAX_SAFE_INTEGER;
        const bRank = b.shortlistRank ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("employer_matches_failed", error);
    return NextResponse.json({ matches: [] });
  }
}
