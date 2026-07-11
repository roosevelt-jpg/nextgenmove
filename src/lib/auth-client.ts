"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import type { UserRole } from "@/types/user";

export interface SessionResponse {
  role: UserRole;
  redirectTo: string;
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  year?: string;
}

export interface RegisterStudentProfile {
  fullName: string;
  phone: string;
  nationality: string;
  workExperience: string;
  education: EducationEntry[];
  sector: string;
  seniority: string;
  currentCity: string;
  targetCities: string[];
  bio?: string;
  skills?: string[];
  availability?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  referralCode?: string;
}

export interface RegisterCompanyProfile {
  companyName: string;
  contactName: string;
  phone: string;
  nationality: string;
  industry: string;
  website?: string;
  preferredLocations: string[];
  hiringNeeds?: string;
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Reserved for a future Google sign-in provider hook. */
export type AuthProviderId = "password" | "google";

export async function establishSession(idToken: string): Promise<SessionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error ?? "session_failed");
    }

    return response.json() as Promise<SessionResponse>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("session_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function clearSession(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}

export async function registerAccount(input: {
  email: string;
  password: string;
  role: "company" | "student";
  consentRequired: true;
  consentMarketing?: boolean;
  consentRequiredAt?: string;
  student?: RegisterStudentProfile;
  company?: RegisterCompanyProfile;
}): Promise<{ uid: string; role: "company" | "student"; nextStep: string }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "register_failed");
  }

  return response.json() as Promise<{
    uid: string;
    role: "company" | "student";
    nextStep: string;
  }>;
}
