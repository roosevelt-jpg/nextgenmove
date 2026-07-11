import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";

export interface StudentDocument {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  photoUrl: string | null;
  sector: string;
  seniority: string;
  currentCity: string;
  targetCities: string[];
  cvUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  bio: string;
  skills: string[];
  availability: string;
  credits: number;
  status: "active" | "placed" | "inactive";
  referralCode?: string | null;
  referredBy?: string | null;
  notificationPreferences?: Record<string, boolean>;
}

export interface StudentSession {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  studentId: string;
  student: StudentDocument;
}

function mapStudentDoc(id: string, data: Record<string, unknown>): StudentDocument {
  return {
    id,
    userId: (data.userId as string | undefined) ?? id,
    fullName: (data.fullName as string | undefined) ?? "",
    email: (data.email as string | undefined) ?? "",
    photoUrl: (data.photoUrl as string | null | undefined) ?? null,
    sector: (data.sector as string | undefined) ?? "",
    seniority: (data.seniority as string | undefined) ?? "",
    currentCity: (data.currentCity as string | undefined) ?? "",
    targetCities: (data.targetCities as string[] | undefined) ?? [],
    cvUrl: (data.cvUrl as string | null | undefined) ?? null,
    linkedinUrl: (data.linkedinUrl as string | null | undefined) ?? null,
    portfolioUrl: (data.portfolioUrl as string | null | undefined) ?? null,
    bio: (data.bio as string | undefined) ?? "",
    skills: (data.skills as string[] | undefined) ?? [],
    availability: (data.availability as string | undefined) ?? "",
    credits: (data.credits as number | undefined) ?? 0,
    status: (data.status as StudentDocument["status"] | undefined) ?? "active",
    referralCode: (data.referralCode as string | null | undefined) ?? null,
    referredBy: (data.referredBy as string | null | undefined) ?? null,
    notificationPreferences:
      (data.notificationPreferences as Record<string, boolean> | undefined) ?? {},
  };
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return null;
  }

  const studentSnapshot = await adminDb.collection("students").doc(user.uid).get();

  if (!studentSnapshot.exists) {
    return null;
  }

  return {
    user,
    studentId: studentSnapshot.id,
    student: mapStudentDoc(
      studentSnapshot.id,
      studentSnapshot.data()! as Record<string, unknown>,
    ),
  };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function calculateProfileCompleteness(student: StudentDocument): number {
  const checks = [
    Boolean(student.fullName),
    Boolean(student.sector),
    Boolean(student.seniority),
    Boolean(student.currentCity),
    student.targetCities.length > 0,
    Boolean(student.bio),
    student.skills.length > 0,
    Boolean(student.cvUrl),
    Boolean(student.linkedinUrl || student.portfolioUrl),
    Boolean(student.availability),
    Boolean(student.photoUrl),
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
