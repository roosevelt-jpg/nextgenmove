import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { computeMatchScore } from "@/lib/matching/score";
import { stripUndefined } from "@/lib/stripUndefined";

/** Deterministic match document id for a company↔student pair. */
export function matchDocId(companyId: string, studentId: string): string {
  return `${companyId}_${studentId}`;
}

export async function recomputeCompanyMatchScores(companyId: string): Promise<number> {
  const [companySnap, matchesSnap] = await Promise.all([
    adminDb.collection("companies").doc(companyId).get(),
    adminDb.collection("matches").where("companyId", "==", companyId).get(),
  ]);

  if (!companySnap.exists || matchesSnap.empty) {
    return 0;
  }

  const companyData = companySnap.data()!;
  let updated = 0;

  for (const matchDoc of matchesSnap.docs) {
    const studentId = String(matchDoc.data().studentId ?? "");
    if (!studentId) continue;
    const studentSnap = await adminDb.collection("students").doc(studentId).get();
    if (!studentSnap.exists) continue;
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
        industry: companyData.industry ?? "",
        preferredLocations: companyData.preferredLocations ?? [],
        requirementTags: companyData.requirementTags ?? [],
      },
    });

    await matchDoc.ref.update(
      stripUndefined({
        matchScore,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    updated += 1;
  }

  return updated;
}

export async function recomputeStudentMatchScores(studentId: string): Promise<number> {
  const [studentSnap, matchesSnap] = await Promise.all([
    adminDb.collection("students").doc(studentId).get(),
    adminDb.collection("matches").where("studentId", "==", studentId).get(),
  ]);

  if (!studentSnap.exists || matchesSnap.empty) {
    return 0;
  }

  const student = studentSnap.data()!;
  let updated = 0;

  for (const matchDoc of matchesSnap.docs) {
    const companyId = String(matchDoc.data().companyId ?? "");
    if (!companyId) continue;
    const companySnap = await adminDb.collection("companies").doc(companyId).get();
    if (!companySnap.exists) continue;
    const companyData = companySnap.data()!;
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
        industry: companyData.industry ?? "",
        preferredLocations: companyData.preferredLocations ?? [],
        requirementTags: companyData.requirementTags ?? [],
      },
    });

    await matchDoc.ref.update(
      stripUndefined({
        matchScore,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    updated += 1;
  }

  return updated;
}
