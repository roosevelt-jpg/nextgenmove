"use client";

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import type { UserRole } from "@/types/user";

export interface SessionResponse {
  role: UserRole;
  redirectTo: string;
}

export interface TwoFactorRequiredError {
  error: "two_factor_required";
  methods: { email: boolean; phone: boolean };
  phone?: string | null;
  phoneHint?: string | null;
}

export function isTwoFactorRequiredError(
  value: unknown,
): value is TwoFactorRequiredError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { error?: string }).error === "two_factor_required"
  );
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
  gender?: string;
  workExperience: string;
  education: EducationEntry[];
  sector: string;
  seniority: string;
  currentCity: string;
  targetCities: string[];
  country?: string;
  countryCode?: string;
  town?: string;
  suburb?: string;
  placeId?: string;
  formattedAddress?: string;
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
  country?: string;
  countryCode?: string;
  city?: string;
  town?: string;
  suburb?: string;
  placeId?: string;
  formattedAddress?: string;
  hiringNeeds?: string;
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

/** Reserved for a future Google sign-in provider hook. */
export type AuthProviderId = "password" | "google";

export class SessionEstablishError extends Error {
  payload: Record<string, unknown>;

  constructor(payload: Record<string, unknown>) {
    super(String(payload.error ?? "session_failed"));
    this.name = "SessionEstablishError";
    this.payload = payload;
  }
}

export async function establishSession(idToken: string): Promise<SessionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      // Same-origin, but include so Set-Cookie is always applied before redirect.
      credentials: "same-origin",
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;
      if (payload?.error === "two_factor_required") {
        throw new SessionEstablishError(payload);
      }
      throw new Error(String(payload?.error ?? "session_failed"));
    }

    return response.json() as Promise<SessionResponse>;
  } catch (error) {
    if (error instanceof SessionEstablishError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("session_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function login2faRequest(body: {
  action: "send_email_otp" | "verify_email_otp" | "confirm_phone" | "complete_session";
  idToken: string;
  code?: string;
  phoneE164?: string;
}): Promise<SessionResponse | { ok: true }> {
  const response = await fetch("/api/auth/login-2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | (SessionResponse & { error?: string; ok?: boolean })
    | { error?: string; ok?: boolean }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "login_2fa_failed");
  }

  if (body.action === "complete_session") {
    return payload as SessionResponse;
  }
  return { ok: true };
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
}): Promise<{
  uid: string;
  role: "company" | "student";
  nextStep: string;
  referralWarning?: string;
}> {
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
    referralWarning?: string;
  }>;
}

export async function registerGoogleAccount(input: {
  idToken: string;
  role: "company" | "student";
  consentRequired: true;
  consentMarketing?: boolean;
  consentRequiredAt?: string;
  student?: RegisterStudentProfile;
  company?: RegisterCompanyProfile;
}): Promise<{
  uid: string;
  role: string;
  nextStep: string;
  alreadyRegistered?: boolean;
  profileComplete?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  phone?: string | null;
  referralWarning?: string;
}> {
  const response = await fetch("/api/auth/register-google", {
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

  return response.json();
}
