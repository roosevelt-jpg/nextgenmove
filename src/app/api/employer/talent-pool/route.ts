import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

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

    const rows = [];

    for (const matchDoc of matchesSnapshot.docs) {
      const match = matchDoc.data();
      const studentSnapshot = await adminDb
        .collection("students")
        .doc(match.studentId)
        .get();

      if (!studentSnapshot.exists) {
        continue;
      }

      const student = studentSnapshot.data()!;

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
        const haystack = [
          student.fullName,
          student.email,
          student.currentCity,
          student.sector,
          ...(student.skills ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) {
          continue;
        }
      }

      rows.push({
        matchId: matchDoc.id,
        shortlisted: Boolean(match.shortlisted),
        stageId: match.stageId ?? "",
        matchScore:
          typeof match.matchScore === "number" ? match.matchScore : null,
        studentId: studentSnapshot.id,
        fullName: student.fullName ?? "",
        email: student.email ?? "",
        sector: student.sector ?? "",
        seniority: student.seniority ?? "",
        currentCity: student.currentCity ?? "",
        skills: student.skills ?? [],
        availability: student.availability ?? "",
        bio: student.bio ?? "",
      });
    }

    rows.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("talent_pool_failed", error);
    return NextResponse.json({ rows: [] });
  }
}
