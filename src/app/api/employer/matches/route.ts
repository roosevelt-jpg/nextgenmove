import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

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
    const matches = [];

    for (const matchDoc of matchesSnapshot.docs) {
      const match = matchDoc.data();
      const studentSnapshot = await adminDb
        .collection("students")
        .doc(match.studentId)
        .get();

      matches.push({
        id: matchDoc.id,
        companyId: match.companyId,
        studentId: match.studentId,
        stageId: match.stageId ?? "",
        shortlisted: Boolean(match.shortlisted),
        source: match.source ?? "",
        notes: match.notes ?? [],
        createdAt: match.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: match.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        student: studentSnapshot.exists
          ? {
              fullName: studentSnapshot.data()?.fullName ?? "",
              email: studentSnapshot.data()?.email ?? "",
              sector: studentSnapshot.data()?.sector ?? "",
              seniority: studentSnapshot.data()?.seniority ?? "",
              currentCity: studentSnapshot.data()?.currentCity ?? "",
            }
          : null,
      });
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("employer_matches_failed", error);
    return NextResponse.json({ matches: [] });
  }
}
