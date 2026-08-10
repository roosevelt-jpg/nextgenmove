import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { isStudentInitiatedMatch } from "@/lib/employer/student-visibility";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";
import { anonymizedEmployerLabel } from "@/lib/marketplace/company-visibility";
import { resolveCompanyUnlockStatus } from "@/lib/marketplace/employer-label";
import {
  isCompanyIdentityUnlocked,
  isStudentIdentityUnlocked,
} from "@/lib/marketplace/mutual-unlock";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const snap = await adminDb
    .collection("matches")
    .where("studentId", "==", session.studentId)
    .get();

  const studentMatches = snap.docs.filter((doc) =>
    isStudentInitiatedMatch(doc.data()),
  );

  const jobIds = [
    ...new Set(
      studentMatches
        .map((d) => String(d.data().jobPostingId ?? ""))
        .filter(Boolean),
    ),
  ];
  const companyIds = [
    ...new Set(
      studentMatches
        .map((d) => String(d.data().companyId ?? ""))
        .filter(Boolean),
    ),
  ];

  const jobs = new Map<
    string,
    {
      title: string;
      employerLabel?: string;
      companyName: string;
    }
  >();
  await Promise.all(
    jobIds.map(async (id) => {
      const j = await adminDb.collection("job_postings").doc(id).get();
      if (!j.exists) return;
      const data = j.data()!;
      jobs.set(id, {
        title: String(data.title ?? ""),
        employerLabel: data.employerLabel
          ? String(data.employerLabel)
          : undefined,
        companyName: String(data.companyName ?? ""),
      });
    }),
  );

  const companies = new Map<
    string,
    {
      name: string;
      website?: string;
      logoUrl?: string;
      contactEmail?: string;
    }
  >();
  await Promise.all(
    companyIds.map(async (id) => {
      const c = await adminDb.collection("companies").doc(id).get();
      if (c.exists) {
        const data = c.data()!;
        companies.set(id, {
          name: String(data.name ?? data.companyName ?? ""),
          website: data.website ? String(data.website) : undefined,
          logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
          contactEmail: data.contactEmail
            ? String(data.contactEmail)
            : undefined,
        });
      }
    }),
  );

  const items = studentMatches
    .map((doc) => {
      const data = doc.data();
      const jobPostingId = data.jobPostingId ? String(data.jobPostingId) : null;
      const companyId = String(data.companyId ?? "");
      const job = jobPostingId ? jobs.get(jobPostingId) : undefined;
      const unlockStatus = resolveCompanyUnlockStatus(data);
      const unlocked =
        isCompanyIdentityUnlocked(data) || unlockStatus === "approved";
      const company = companies.get(companyId);
      const realName = company?.name || job?.companyName || "";
      const employerLabel = unlocked
        ? realName ||
          anonymizedEmployerLabel(
            companyId,
            (data.employerLabel ? String(data.employerLabel) : null) ||
              job?.employerLabel ||
              null,
          )
        : anonymizedEmployerLabel(
            companyId,
            (data.employerLabel ? String(data.employerLabel) : null) ||
              job?.employerLabel ||
              null,
          );

      return {
        id: doc.id,
        jobPostingId,
        jobTitle: String(data.jobTitle ?? job?.title ?? ""),
        employerLabel,
        companyIdentityUnlocked: unlocked,
        companyUnlockStatus: unlocked ? "approved" : unlockStatus,
        identityUnlocked: isStudentIdentityUnlocked(data),
        applicationStatus: String(data.applicationStatus ?? "pending"),
        stageId: String(data.stageId ?? ""),
        shortlisted: Boolean(data.shortlisted),
        interviewAt: serializeTimestamp(data.interviewAt),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        ...(unlocked
          ? {
              companyName: realName,
              companyWebsite: company?.website ?? null,
              companyLogoUrl: company?.logoUrl ?? null,
              companyContactEmail: company?.contactEmail ?? "",
            }
          : {}),
      };
    })
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
        String(a.updatedAt ?? a.createdAt ?? ""),
      ),
    );

  return NextResponse.json({ items });
}
