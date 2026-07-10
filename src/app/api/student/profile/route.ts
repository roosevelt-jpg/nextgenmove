import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  calculateProfileCompleteness,
  getStudentSession,
  unauthorizedResponse,
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

export async function PATCH(request: Request) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = profileSchema.parse(await request.json());

    await adminDb
      .collection("students")
      .doc(session.studentId)
      .update(stripUndefined(body));

    const updated = await adminDb.collection("students").doc(session.studentId).get();
    const student = updated.data()!;

    return NextResponse.json({
      student: { id: updated.id, ...student },
      profileCompleteness: calculateProfileCompleteness({
        id: updated.id,
        userId: student.userId ?? updated.id,
        fullName: student.fullName ?? "",
        email: student.email ?? "",
        photoUrl: student.photoUrl ?? null,
        sector: student.sector ?? "",
        seniority: student.seniority ?? "",
        currentCity: student.currentCity ?? "",
        targetCities: student.targetCities ?? [],
        cvUrl: student.cvUrl ?? null,
        linkedinUrl: student.linkedinUrl ?? null,
        portfolioUrl: student.portfolioUrl ?? null,
        bio: student.bio ?? "",
        skills: student.skills ?? [],
        availability: student.availability ?? "",
        credits: student.credits ?? 0,
        status: student.status ?? "active",
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("student_profile_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
