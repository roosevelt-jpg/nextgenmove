import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import type { CurrentUser } from "@/types/user";

export interface CompanyDocument {
  id: string;
  userId: string;
  name: string;
  contactEmail: string;
  logoUrl: string | null;
  industry: string;
  website: string | null;
  plan: "track_a" | "track_b" | null;
  subscriptionStatus: "active" | "inactive" | "pending";
  requirements: CompanyRequirement[];
  notificationPreferences?: Record<string, boolean>;
  createdAt: unknown;
}

export interface CompanyRequirement {
  id: string;
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface EmployerSession {
  user: CurrentUser;
  companyId: string;
  company: CompanyDocument;
}

export async function getEmployerSession(): Promise<EmployerSession | null> {
  const user = await getCurrentUser();

  if (!user || user.role !== "company") {
    return null;
  }

  const companySnapshot = await adminDb.collection("companies").doc(user.uid).get();

  if (!companySnapshot.exists) {
    return null;
  }

  const data = companySnapshot.data()!;

  return {
    user,
    companyId: companySnapshot.id,
    company: {
      id: companySnapshot.id,
      userId: data.userId ?? user.uid,
      name: data.name ?? "",
      contactEmail: data.contactEmail ?? "",
      logoUrl: data.logoUrl ?? null,
      industry: data.industry ?? "",
      website: data.website ?? null,
      plan: data.plan ?? null,
      subscriptionStatus: data.subscriptionStatus ?? "pending",
      requirements: data.requirements ?? [],
      notificationPreferences: data.notificationPreferences ?? {},
      createdAt: data.createdAt,
    },
  };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function verifyMatchOwnership(
  matchId: string,
  companyId: string,
): Promise<(Record<string, unknown> & { id: string }) | null> {
  const matchSnapshot = await adminDb.collection("matches").doc(matchId).get();

  if (!matchSnapshot.exists) {
    return null;
  }

  const data = matchSnapshot.data()!;

  if (data.companyId !== companyId) {
    return null;
  }

  return { id: matchSnapshot.id, ...data };
}
