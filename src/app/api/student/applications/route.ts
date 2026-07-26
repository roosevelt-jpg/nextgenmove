import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { isStudentInitiatedMatch } from "@/lib/employer/student-visibility";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const snap = await adminDb
    .collection("matches")
    .where("studentId", "==", session.studentId)
    .get();

  // Only applications the student initiated — never company-browsed interest.
  const studentMatches = snap.docs.filter((doc) =>
    isStudentInitiatedMatch(doc.data()),
  );

  const companyIds = [
    ...new Set(
      studentMatches
        .map((d) => String(d.data().companyId ?? ""))
        .filter(Boolean),
    ),
  ];
  const companyNames = new Map<string, string>();
  await Promise.all(
    companyIds.map(async (id) => {
      const c = await adminDb.collection("companies").doc(id).get();
      if (c.exists) {
        companyNames.set(id, String(c.data()?.name ?? c.data()?.companyName ?? ""));
      }
    }),
  );

  const items = studentMatches
    .map((doc) => {
      const data = doc.data();
      const companyId = String(data.companyId ?? "");
      return {
        id: doc.id,
        jobPostingId: data.jobPostingId ? String(data.jobPostingId) : null,
        jobTitle: String(data.jobTitle ?? ""),
        // Company name is OK only for roles the student knowingly applied to.
        companyName: companyNames.get(companyId) ?? "",
        applicationStatus: String(data.applicationStatus ?? "pending"),
        stageId: String(data.stageId ?? ""),
        shortlisted: Boolean(data.shortlisted),
        interviewAt: serializeTimestamp(data.interviewAt),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    })
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
        String(a.updatedAt ?? a.createdAt ?? ""),
      ),
    );

  return NextResponse.json({ items });
}
