import { adminDb } from "@/lib/firebase-admin";
import type { UserRole } from "@/types/user";

/**
 * Security emails always send. Product emails respect notificationPreferences
 * (default ON when key missing).
 */
export async function shouldSendEmail(options: {
  userId?: string | null;
  role?: UserRole | null;
  preferenceKey: string | null;
}): Promise<boolean> {
  if (!options.preferenceKey) {
    return true;
  }

  if (!options.userId) {
    return true;
  }

  const role = options.role;
  let prefs: Record<string, boolean> = {};

  if (role === "student") {
    const snap = await adminDb.collection("students").doc(options.userId).get();
    prefs = (snap.data()?.notificationPreferences ?? {}) as Record<string, boolean>;
  } else if (role === "company") {
    const snap = await adminDb.collection("companies").doc(options.userId).get();
    prefs = (snap.data()?.notificationPreferences ?? {}) as Record<string, boolean>;
  } else {
    const snap = await adminDb.collection("users").doc(options.userId).get();
    prefs = (snap.data()?.notificationPreferences ?? {}) as Record<string, boolean>;
  }

  if (Object.prototype.hasOwnProperty.call(prefs, options.preferenceKey)) {
    return Boolean(prefs[options.preferenceKey]);
  }

  return true;
}
