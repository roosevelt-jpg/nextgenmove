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
  const sector = searchParams.get("sector") ?? "";
  const seniority = searchParams.get("seniority") ?? "";
  const location = searchParams.get("location") ?? "";

  try {
    const matchesSnapshot = await adminDb
      .collection("matches")
      .where("companyId", "==", session.companyId)
      .where("source", "in", ["admin_curated", "company_browsed"])
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

      rows.push({
        matchId: matchDoc.id,
        shortlisted: Boolean(match.shortlisted),
        studentId: studentSnapshot.id,
        fullName: student.fullName ?? "",
        email: student.email ?? "",
        sector: student.sector ?? "",
        seniority: student.seniority ?? "",
        currentCity: student.currentCity ?? "",
        skills: student.skills ?? [],
        availability: student.availability ?? "",
      });
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("talent_pool_failed", error);
    return NextResponse.json({ rows: [] });
  }
}
