import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
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

  const companyIds = [
    ...new Set(
      snap.docs
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

  const items = snap.docs
    .map((doc) => {
      const data = doc.data();
      const companyId = String(data.companyId ?? "");
      return {
        id: doc.id,
        jobPostingId: data.jobPostingId ? String(data.jobPostingId) : null,
        jobTitle: String(data.jobTitle ?? ""),
        companyId,
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
