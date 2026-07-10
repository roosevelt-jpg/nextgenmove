"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import type { UserRole } from "@/types/user";

export interface SessionResponse {
  role: UserRole;
  redirectTo: string;
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Reserved for a future Google sign-in provider hook. */
export type AuthProviderId = "password" | "google";

export async function establishSession(idToken: string): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "session_failed");
  }

  return response.json() as Promise<SessionResponse>;
}

export async function clearSession(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}

export async function registerAccount(input: {
  email: string;
  password: string;
  role: "company" | "student";
  displayName?: string;
}): Promise<{ uid: string }> {
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

  return response.json() as Promise<{ uid: string }>;
}
