import { NextResponse } from "next/server";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  anonymizedEmployerLabel,
} from "@/lib/marketplace/company-visibility";
import { isCompanyIdentityUnlocked } from "@/lib/marketplace/mutual-unlock";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const [jobsSnap, matchesSnap] = await Promise.all([
    adminDb.collection("job_postings").where("status", "==", "open").get(),
    adminDb
      .collection("matches")
      .where("studentId", "==", session.studentId)
      .get(),
  ]);

  const unlockByJob = new Map<string, boolean>();
  for (const doc of matchesSnap.docs) {
    const data = doc.data();
    const jobId = data.jobPostingId ? String(data.jobPostingId) : "";
    if (!jobId) continue;
    if (isCompanyIdentityUnlocked(data)) unlockByJob.set(jobId, true);
  }

  const items = jobsSnap.docs
    .map((doc) => {
      const data = doc.data();
      const categories = Array.isArray(data.categories)
        ? data.categories.map(String)
        : [];
      const skills = Array.isArray(data.skills) ? data.skills.map(String) : [];
      const department = String(data.department ?? "");
      const location = String(data.location ?? "");
      const companyId = String(data.companyId ?? "");
      const unlocked = unlockByJob.get(doc.id) === true;
      const employerLabel = unlocked
        ? String(data.companyName ?? "").trim() ||
          anonymizedEmployerLabel(companyId, data.employerLabel)
        : anonymizedEmployerLabel(companyId, data.employerLabel);

      return {
        id: doc.id,
        title: String(data.title ?? ""),
        employerLabel,
        location,
        salary: String(data.salary ?? ""),
        employmentType: String(data.employmentType ?? ""),
        department,
        skills,
        categories,
        postedAt: serializeTimestamp(data.postedAt ?? data.createdAt),
        companyIdentityUnlocked: unlocked,
      };
    })
    .sort((a, b) =>
      String(b.postedAt ?? "").localeCompare(String(a.postedAt ?? "")),
    );

  return NextResponse.json({ items });
}
