import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { revokeUserSessions } from "@/lib/security/session-revoke";
import { logger } from "@/lib/observability/logger";

/**
 * GDPR-oriented account deactivation: suspend auth, revoke sessions,
 * anonymize PII on user/student (or company) docs. Preserves referential IDs.
 */
export async function anonymizeAndSuspendAccount(options: {
  uid: string;
  role: "student" | "company" | "admin";
  reason: string;
}): Promise<void> {
  const { uid, role, reason } = options;
  const now = FieldValue.serverTimestamp();
  const anonymizedEmail = `deleted+${uid.slice(0, 8)}@anonymized.invalid`;

  await adminDb
    .collection("users")
    .doc(uid)
    .update(
      stripUndefined({
        status: "suspended",
        displayName: "Deleted User",
        email: anonymizedEmail,
        photoUrl: null,
        deletedAt: now,
        anonymizedAt: now,
        anonymizeReason: reason,
      }),
    );

  if (role === "student") {
    await adminDb
      .collection("students")
      .doc(uid)
      .update(
        stripUndefined({
          status: "inactive",
          fullName: "Deleted User",
          email: anonymizedEmail,
          photoUrl: null,
          bio: "",
          skills: [],
          linkedinUrl: null,
          portfolioUrl: null,
          cvUrl: null,
          currentCity: "",
          targetCities: [],
          deletedAt: now,
        }),
      );
  }

  if (role === "company") {
    await adminDb
      .collection("companies")
      .doc(uid)
      .update(
        stripUndefined({
          name: "Deleted Company",
          contactEmail: anonymizedEmail,
          logoUrl: null,
          website: null,
          subscriptionStatus: "inactive",
          deletedAt: now,
        }),
      );
  }

  try {
    await adminAuth.updateUser(uid, {
      displayName: "Deleted User",
      email: anonymizedEmail,
      disabled: true,
      photoURL: null,
    });
  } catch (error) {
    logger.warn("auth_user_anonymize_partial", {
      userId: uid,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await revokeUserSessions(uid, reason);

  logger.info("account_anonymized", { userId: uid, role, reason });
}
