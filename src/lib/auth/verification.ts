import { createHash, randomInt } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendTransactional } from "@/lib/email/send";
import { stripUndefined } from "@/lib/stripUndefined";

const OTP_TTL_MS = 10 * 60 * 1000;
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

export async function issueEmailOtp(options: {
  uid: string;
  email: string;
  displayName?: string;
  request?: Request;
}): Promise<{ sent: boolean; reason?: string }> {
  const code = generateOtp();
  const salt = options.uid;
  const expiresAt = Timestamp.fromMillis(Date.now() + OTP_TTL_MS);

  await challengeRef(options.uid).set(
    stripUndefined({
      uid: options.uid,
      email: options.email.toLowerCase(),
      emailCodeHash: hashOtp(code, salt),
      emailExpiresAt: expiresAt,
      emailAttempts: 0,
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

  // If CMS template missing, send a minimal branded fallback via the same router
  if (!result.sent && result.reason === "missing_template") {
    const { sendRawEmail, isAnyEmailProviderLive } = await import(
      "@/lib/email/send"
    );
    if (!(await isAnyEmailProviderLive())) {
      return result;
    }
    const raw = await sendRawEmail({
      to: options.email,
      subject: "Your verification code",
      html: `<p>Your Nextgenmove verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
      text: `Your Nextgenmove verification code is ${code}. It expires in 10 minutes.`,
    });
    return raw.sent ? { sent: true } : result;
  }

  return result;
}

export async function verifyEmailOtp(options: {
  uid: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const snap = await challengeRef(options.uid).get();
  if (!snap.exists) {
    return { ok: false, error: "otp_not_found" };
  }

  const data = snap.data()!;
  const attempts = Number(data.emailAttempts ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "otp_locked" };
  }

  const expiresAt = data.emailExpiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    return { ok: false, error: "otp_expired" };
  }

  const expected = String(data.emailCodeHash ?? "");
  const actual = hashOtp(options.code.trim(), options.uid);
  if (expected !== actual) {
    await challengeRef(options.uid).set(
      { emailAttempts: attempts + 1, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { ok: false, error: "otp_invalid" };
  }

  await adminAuth.updateUser(options.uid, { emailVerified: true });
  await adminDb.collection("users").doc(options.uid).set(
    stripUndefined({
      emailVerified: true,
      emailVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  await challengeRef(options.uid).update(
    stripUndefined({
      emailCodeHash: FieldValue.delete(),
      emailVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  return { ok: true };
}

export async function markPhoneVerified(options: {
  uid: string;
  phoneE164: string;
}): Promise<void> {
  const authUser = await adminAuth.getUser(options.uid);
  if (!authUser.phoneNumber) {
    await adminAuth.updateUser(options.uid, {
      phoneNumber: options.phoneE164,
    });
  }

  await adminDb.collection("users").doc(options.uid).set(
    stripUndefined({
      phone: options.phoneE164,
      phoneVerified: true,
      phoneVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const userSnap = await adminDb.collection("users").doc(options.uid).get();
  const role = String(userSnap.data()?.role ?? "");
  if (role === "student") {
    await adminDb.collection("students").doc(options.uid).set(
      stripUndefined({
        phone: options.phoneE164,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  } else if (role === "company") {
    await adminDb.collection("companies").doc(options.uid).set(
      stripUndefined({
        contactPhone: options.phoneE164,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  }
}

export async function getVerificationStatus(uid: string): Promise<{
  emailVerified: boolean;
  phoneVerified: boolean;
  phone: string | null;
  email: string | null;
}> {
  const [authUser, userSnap] = await Promise.all([
    adminAuth.getUser(uid),
    adminDb.collection("users").doc(uid).get(),
  ]);
  const data = userSnap.data() ?? {};
  return {
    emailVerified: Boolean(authUser.emailVerified || data.emailVerified),
    phoneVerified: Boolean(data.phoneVerified),
    phone: authUser.phoneNumber || String(data.phone ?? "") || null,
    email: authUser.email || String(data.email ?? "") || null,
  };
}
