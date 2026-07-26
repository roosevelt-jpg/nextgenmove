import {
  linkWithPhoneNumber,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type RecaptchaVerifier,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Normalize dialed numbers toward E.164 (requires leading +). */
export function toE164Phone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s()-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  return `+${trimmed}`;
}

export async function ensureRecaptcha(
  containerId = "signup-recaptcha",
): Promise<RecaptchaVerifier> {
  if (typeof window === "undefined") {
    throw new Error("recaptcha_ssr");
  }

  const { RecaptchaVerifier: Verifier } = await import("firebase/auth");

  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }

  let el = document.getElementById(containerId);
  if (!el) {
    el = document.createElement("div");
    el.id = containerId;
    el.className = "sr-only";
    document.body.appendChild(el);
  }

  recaptchaVerifier = new Verifier(auth, containerId, {
    size: "invisible",
  });
  await recaptchaVerifier.render();
  return recaptchaVerifier;
}

export async function startPhoneVerification(
  phoneE164: string,
): Promise<ConfirmationResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("not_signed_in");
  }
  const verifier = await ensureRecaptcha();
  return linkWithPhoneNumber(user, phoneE164, verifier);
}

/**
 * Login 2FA phone challenge.
 * - If the signed-in user has no Auth phone yet → linkWithPhoneNumber (enrolls + sends SMS).
 * - If phone already linked → signInWithPhoneNumber (SMS challenge; same uid when linked).
 */
export async function startLoginPhoneVerification(
  phoneE164: string,
): Promise<ConfirmationResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("not_signed_in");
  }
  const e164 = toE164Phone(phoneE164);
  const verifier = await ensureRecaptcha("login-2fa-recaptcha");

  if (!user.phoneNumber) {
    return linkWithPhoneNumber(user, e164, verifier);
  }

  if (user.phoneNumber !== e164) {
    throw new Error("phone_mismatch");
  }

  return signInWithPhoneNumber(auth, e164, verifier);
}

/**
 * Confirm login SMS. Returns phone + whether the resulting Auth uid matches expected.
 */
export async function confirmLoginPhoneCode(
  confirmation: ConfirmationResult,
  code: string,
  expectedUid: string,
): Promise<{ phone: string; uid: string }> {
  const result = await confirmation.confirm(code.trim());
  const phone = result.user.phoneNumber;
  if (!phone) {
    throw new Error("phone_missing_after_confirm");
  }
  if (result.user.uid !== expectedUid) {
    throw new Error("phone_uid_mismatch");
  }
  return { phone, uid: result.user.uid };
}

export async function confirmPhoneCode(
  confirmation: ConfirmationResult,
  code: string,
): Promise<string> {
  const result = await confirmation.confirm(code.trim());
  const phone = result.user.phoneNumber;
  if (!phone) {
    throw new Error("phone_missing_after_confirm");
  }
  return phone;
}

export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }
}
