import { NextResponse } from "next/server";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const snap = await adminDb
    .collection("job_postings")
    .where("status", "==", "open")
    .get();

  const items = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? ""),
        companyName: String(data.companyName ?? ""),
        description: String(data.description ?? ""),
        location: String(data.location ?? ""),
        salary: String(data.salary ?? ""),
        employmentType: String(data.employmentType ?? ""),
        gender: String(data.gender ?? ""),
        categories: Array.isArray(data.categories)
          ? data.categories.map(String)
          : [],
        skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
        department: String(data.department ?? ""),
        postedAt: serializeTimestamp(data.postedAt ?? data.createdAt),
      };
    })
    .sort((a, b) =>
      String(b.postedAt ?? "").localeCompare(String(a.postedAt ?? "")),
    );

  return NextResponse.json({ items });
}
