import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta, getWayToEarnCredits } from "@/lib/credits/ledger";
import { stripUndefined } from "@/lib/stripUndefined";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

export async function ensureStudentReferralCode(studentId: string): Promise<string> {
  const ref = adminDb.collection("students").doc(studentId);
  const snap = await ref.get();
  const existing = snap.data()?.referralCode as string | undefined;
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    const clash = await adminDb
      .collection("students")
      .where("referralCode", "==", code)
      .limit(1)
      .get();
    if (!clash.empty) continue;

    await ref.update(stripUndefined({ referralCode: code }));
    return code;
  }

  const fallback = `NG${studentId.slice(0, 6).toUpperCase()}`;
  await ref.update(stripUndefined({ referralCode: fallback }));
  return fallback;
}

/**
 * Apply a referral code for a newly registered / existing student who has not
 * been referred yet. Grants the referrer the program_levers referral bonus once.
 */
export async function applyReferralCode(options: {
  studentId: string;
  code: string;
}): Promise<{ ok: true; referrerId: string } | { ok: false; error: string }> {
  const code = options.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "invalid_code" };

  const studentRef = adminDb.collection("students").doc(options.studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return { ok: false, error: "student_not_found" };

  const student = studentSnap.data()!;
  if (student.referredBy) return { ok: false, error: "already_referred" };
  if (String(student.referralCode ?? "").toUpperCase() === code) {
    return { ok: false, error: "self_referral" };
  }

  const referrerSnap = await adminDb
    .collection("students")
    .where("referralCode", "==", code)
    .limit(1)
    .get();

  if (referrerSnap.empty) return { ok: false, error: "invalid_code" };

  const referrerId = referrerSnap.docs[0]!.id;
  if (referrerId === options.studentId) {
    return { ok: false, error: "self_referral" };
  }

  await studentRef.update(
    stripUndefined({
      referredBy: referrerId,
      referredAt: FieldValue.serverTimestamp(),
    }),
  );

  const bonus = await getWayToEarnCredits("referral");
  if (bonus > 0) {
    await applyCreditDelta({
      studentId: referrerId,
      amount: bonus,
      source: `referral:${options.studentId}`,
      once: true,
    });
  }

  await adminDb.collection("referral_redemptions").doc().set(
    stripUndefined({
      referrerId,
      referredStudentId: options.studentId,
      code,
      bonusCredits: bonus,
      createdAt: FieldValue.serverTimestamp(),
    }),
  );

  return { ok: true, referrerId };
}
