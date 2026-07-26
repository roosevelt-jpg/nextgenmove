import { createHash, randomInt } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendTransactional } from "@/lib/email/send";
import { stripUndefined } from "@/lib/stripUndefined";

const OTP_TTL_MS = 10 * 60 * 1000;
const LOGIN_2FA_OK_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashOtp(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

function challengeRef(uid: string) {
  return adminDb.collection("verification_challenges").doc(uid);
}

/** Resolve admin phone for login SMS (Auth phone or Firestore profile). */
export async function resolveAdminPhone(uid: string): Promise<string | null> {
  const [authUser, userSnap] = await Promise.all([
    adminAuth.getUser(uid),
    adminDb.collection("users").doc(uid).get(),
  ]);
  const fromAuth = authUser.phoneNumber?.trim() || "";
  const fromProfile = String(userSnap.data()?.phone ?? "").trim();
  const phone = fromAuth || fromProfile;
  return phone.startsWith("+") ? phone : null;
}

export async function issueLoginEmailOtp(options: {
  uid: string;
  email: string;
  displayName?: string;
  request?: Request;
}): Promise<{ sent: boolean; reason?: string }> {
  const code = generateOtp();
  const salt = `${options.uid}:login_2fa`;
  const expiresAt = Timestamp.fromMillis(Date.now() + OTP_TTL_MS);

  await challengeRef(options.uid).set(
    stripUndefined({
      uid: options.uid,
      email: options.email.toLowerCase(),
      purpose: "login_2fa",
      loginEmailCodeHash: hashOtp(code, salt),
      loginEmailExpiresAt: expiresAt,
      loginEmailAttempts: 0,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const result = await sendTransactional({
    templateId: "email_otp",
    to: options.email,
    userId: options.uid,
    vars: {
      displayName: options.displayName || options.email,
      otpCode: code,
    },
    request: options.request,
    dedupeKey: null,
  });

  if (!result.sent && result.reason === "missing_template") {
    const { sendRawEmail, isAnyEmailProviderLive } = await import(
      "@/lib/email/send"
    );
    if (!(await isAnyEmailProviderLive())) {
      return result;
    }
    const raw = await sendRawEmail({
      to: options.email,
      subject: "Your sign-in verification code",
      html: `<p>Your Nextgenmove sign-in code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
      text: `Your Nextgenmove sign-in code is ${code}. It expires in 10 minutes.`,
    });
    return raw.sent ? { sent: true } : result;
  }

  return result;
}

export async function verifyLoginEmailOtp(options: {
  uid: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const snap = await challengeRef(options.uid).get();
  if (!snap.exists) {
    return { ok: false, error: "otp_not_found" };
  }

  const data = snap.data()!;
  const attempts = Number(data.loginEmailAttempts ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "otp_locked" };
  }

  const expiresAt = data.loginEmailExpiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    return { ok: false, error: "otp_expired" };
  }

  const expected = String(data.loginEmailCodeHash ?? "");
  const actual = hashOtp(options.code.trim(), `${options.uid}:login_2fa`);
  if (expected !== actual) {
    await challengeRef(options.uid).set(
      {
        loginEmailAttempts: attempts + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: false, error: "otp_invalid" };
  }

  await markLogin2faPassed(options.uid, "email");
  return { ok: true };
}

export async function markLogin2faPassed(
  uid: string,
  method: "email" | "phone",
): Promise<void> {
  await challengeRef(uid).set(
    stripUndefined({
      uid,
      purpose: "login_2fa",
      login2faOk: true,
      login2faMethod: method,
      login2faOkExpiresAt: Timestamp.fromMillis(Date.now() + LOGIN_2FA_OK_TTL_MS),
      loginEmailCodeHash: FieldValue.delete(),
      loginEmailExpiresAt: FieldValue.delete(),
      loginEmailAttempts: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function hasValidLogin2faPass(uid: string): Promise<boolean> {
  const snap = await challengeRef(uid).get();
  if (!snap.exists) return false;
  const data = snap.data()!;
  if (!data.login2faOk) return false;
  const expiresAt = data.login2faOkExpiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) return false;
  return true;
}

export async function clearLogin2faPass(uid: string): Promise<void> {
  await challengeRef(uid).set(
    stripUndefined({
      login2faOk: FieldValue.delete(),
      login2faMethod: FieldValue.delete(),
      login2faOkExpiresAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function confirmLoginPhone(options: {
  uid: string;
  phoneE164: string;
  /** Phone number claim from the freshly verified Firebase ID token. */
  tokenPhone: string | null | undefined;
}): Promise<{ ok: boolean; error?: string }> {
  const expected = await resolveAdminPhone(options.uid);
  if (!expected) {
    return { ok: false, error: "phone_not_available" };
  }
  if (options.phoneE164 !== expected) {
    return { ok: false, error: "phone_mismatch" };
  }
  if (!options.tokenPhone || options.tokenPhone !== expected) {
    return { ok: false, error: "phone_not_verified" };
  }

  await markLogin2faPassed(options.uid, "phone");
  return { ok: true };
}
