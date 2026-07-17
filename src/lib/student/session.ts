import { NextResponse } from "next/server";
import { getCurrentUser, getSessionActor } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/async/with-timeout";
import type { PortalSessionMode } from "@/lib/auth/portal-session";

export interface WorkExperienceEntry {
  company: string;
  title: string;
  from: string;
  to?: string | null;
  description?: string;
}

export interface StudentDocument {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  nationality?: string | null;
  workExperience?: string | null;
  workExperienceEntries?: WorkExperienceEntry[];
  education?: Array<{
    institution: string;
    degree?: string;
    year?: string;
  }>;
  photoUrl: string | null;
  sector: string;
  seniority: string;
  currentCity: string;
  targetCities: string[];
  cvUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl?: string | null;
  bio: string;
  skills: string[];
  availability: string;
  credits: number;
  plan: "track_a" | "track_b" | null;
  subscriptionStatus: "active" | "inactive" | "pending";
  status: "active" | "placed" | "inactive";
  referralCode?: string | null;
  referredBy?: string | null;
  notificationPreferences?: Record<string, boolean>;
  createdAt?: unknown;
}

export interface StudentSession {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  studentId: string;
  student: StudentDocument;
  mode: PortalSessionMode;
}

function mapStudentDoc(id: string, data: Record<string, unknown>): StudentDocument {
  return {
    id,
    userId: (data.userId as string | undefined) ?? id,
    fullName: (data.fullName as string | undefined) ?? "",
    email: (data.email as string | undefined) ?? "",
    phone: (data.phone as string | null | undefined) ?? null,
    nationality: (data.nationality as string | null | undefined) ?? null,
    workExperience: (data.workExperience as string | null | undefined) ?? null,
    workExperienceEntries:
      (data.workExperienceEntries as StudentDocument["workExperienceEntries"] | undefined) ??
      [],
    education:
      (data.education as StudentDocument["education"] | undefined) ?? [],
    photoUrl: (data.photoUrl as string | null | undefined) ?? null,
    sector: (data.sector as string | undefined) ?? "",
    seniority: (data.seniority as string | undefined) ?? "",
    currentCity: (data.currentCity as string | undefined) ?? "",
    targetCities: (data.targetCities as string[] | undefined) ?? [],
    cvUrl: (data.cvUrl as string | null | undefined) ?? null,
    linkedinUrl: (data.linkedinUrl as string | null | undefined) ?? null,
    portfolioUrl: (data.portfolioUrl as string | null | undefined) ?? null,
    githubUrl: (data.githubUrl as string | null | undefined) ?? null,
    bio: (data.bio as string | undefined) ?? "",
    skills: (data.skills as string[] | undefined) ?? [],
    availability: (data.availability as string | undefined) ?? "",
    credits: (data.credits as number | undefined) ?? 0,
    plan: (data.plan as StudentDocument["plan"] | undefined) ?? null,
    subscriptionStatus:
      (data.subscriptionStatus as StudentDocument["subscriptionStatus"] | undefined) ??
      "pending",
    status: (data.status as StudentDocument["status"] | undefined) ?? "active",
    referralCode: (data.referralCode as string | null | undefined) ?? null,
    referredBy: (data.referredBy as string | null | undefined) ?? null,
    notificationPreferences:
      (data.notificationPreferences as Record<string, boolean> | undefined) ?? {},
    createdAt: data.createdAt,
  };
}

function emptyPreviewStudent(user: {
  uid: string;
  email: string | null;
  displayName: string;
  photoUrl: string | null;
}): StudentDocument {
  return {
    id: user.uid,
    userId: user.uid,
    fullName: user.displayName || "Admin preview",
    email: user.email ?? "",
    phone: null,
    nationality: null,
    workExperience: null,
    workExperienceEntries: [],
    education: [],
    photoUrl: user.photoUrl,
    sector: "",
    seniority: "",
    currentCity: "",
    targetCities: [],
    cvUrl: null,
    linkedinUrl: null,
    portfolioUrl: null,
    githubUrl: null,
    bio: "",
    skills: [],
    availability: "",
    credits: 0,
    plan: null,
    subscriptionStatus: "pending",
    status: "active",
    referralCode: null,
    referredBy: null,
    notificationPreferences: {},
  };
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.role === "student") {
    try {
      const studentSnapshot = await withTimeout(
        adminDb.collection("students").doc(user.uid).get(),
        3500,
        "student_session_lookup",
      );

      if (!studentSnapshot.exists) {
        return null;
      }

      const mode: PortalSessionMode =
        user.sessionMode === "impersonation" ? "impersonation" : "live";

      return {
        user,
        studentId: studentSnapshot.id,
        student: mapStudentDoc(
          studentSnapshot.id,
          studentSnapshot.data()! as Record<string, unknown>,
        ),
        mode,
      };
    } catch {
      return null;
    }
  }

  // Admin preview (not impersonating a student).
  if (user.role === "admin") {
    const actor = await getSessionActor();
    if (!actor || actor.role !== "admin") {
      return null;
    }

    return {
      user: {
        ...user,
        sessionMode: "preview",
      },
      studentId: actor.uid,
      student: emptyPreviewStudent(actor),
      mode: "preview",
    };
  }

  return null;
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
    Boolean(student.linkedinUrl || student.portfolioUrl || student.githubUrl),
    Boolean(student.availability),
    Boolean(student.photoUrl),
    Boolean(
      (student.workExperienceEntries && student.workExperienceEntries.length > 0) ||
        student.workExperience,
    ),
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
