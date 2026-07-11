import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { syncLinkedProfile } from "@/lib/auth/profile-sync";
import { applyCreditDelta, getWayToEarnCredits } from "@/lib/credits/ledger";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  calculateProfileCompleteness,
  getStudentSession,
  unauthorizedResponse,
  type StudentDocument,
} from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  return NextResponse.json({
    student: session.student,
    profileCompleteness: calculateProfileCompleteness(session.student),
  });
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  sector: z.string().trim().optional(),
  seniority: z.string().trim().optional(),
  currentCity: z.string().trim().optional(),
  targetCities: z.array(z.string().trim()).optional(),
  bio: z.string().trim().optional(),
  skills: z.array(z.string().trim()).optional(),
  cvUrl: z.string().url().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  portfolioUrl: z.string().url().nullable().optional(),
  availability: z.string().trim().optional(),
  photoUrl: z.string().url().nullable().optional(),
});

function mapStudent(id: string, student: Record<string, unknown>): StudentDocument {
  return {
    id,
    userId: (student.userId as string | undefined) ?? id,
    fullName: (student.fullName as string | undefined) ?? "",
    email: (student.email as string | undefined) ?? "",
    photoUrl: (student.photoUrl as string | null | undefined) ?? null,
    sector: (student.sector as string | undefined) ?? "",
    seniority: (student.seniority as string | undefined) ?? "",
    currentCity: (student.currentCity as string | undefined) ?? "",
    targetCities: (student.targetCities as string[] | undefined) ?? [],
    cvUrl: (student.cvUrl as string | null | undefined) ?? null,
    linkedinUrl: (student.linkedinUrl as string | null | undefined) ?? null,
    portfolioUrl: (student.portfolioUrl as string | null | undefined) ?? null,
    bio: (student.bio as string | undefined) ?? "",
    skills: (student.skills as string[] | undefined) ?? [],
    availability: (student.availability as string | undefined) ?? "",
    credits: (student.credits as number | undefined) ?? 0,
    status: (student.status as StudentDocument["status"] | undefined) ?? "active",
  };
}

export async function PATCH(request: Request) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = profileSchema.parse(await request.json());
    const beforeCompleteness = calculateProfileCompleteness(session.student);

    await adminDb
      .collection("students")
      .doc(session.studentId)
      .update(
        stripUndefined({
          ...body,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

    await syncLinkedProfile({
      uid: session.studentId,
      role: "student",
      displayName: body.fullName,
      photoUrl: body.photoUrl,
    });

    const updated = await adminDb.collection("students").doc(session.studentId).get();
    const student = mapStudent(updated.id, updated.data()! as Record<string, unknown>);
    const profileCompleteness = calculateProfileCompleteness(student);

    if (beforeCompleteness < 100 && profileCompleteness >= 100) {
      const bonus = await getWayToEarnCredits("profile_complete");
      if (bonus > 0) {
        const result = await applyCreditDelta({
          studentId: session.studentId,
          amount: bonus,
          source: "profile_complete",
          once: true,
        });
        student.credits = result.credits;
      }
    }

    return NextResponse.json({
      student,
      profileCompleteness,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("student_profile_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
