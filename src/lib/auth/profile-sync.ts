import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { UserRole } from "@/types/user";

/**
 * Keep users ↔ students / companies linked on the same uid.
 * displayName/photoUrl/phone/email stay mirrored for portal + Auth.
 */
export async function syncLinkedProfile(options: {
  uid: string;
  role: UserRole;
  displayName?: string;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string;
  /** Employer company display name (not the contact person). */
  companyName?: string;
  contactName?: string;
}) {
  const { uid, role } = options;
  const now = FieldValue.serverTimestamp();

  const userUpdates: Record<string, unknown> = { updatedAt: now };
  if (options.displayName !== undefined) userUpdates.displayName = options.displayName;
  if (options.contactName !== undefined) userUpdates.displayName = options.contactName;
  if (options.photoUrl !== undefined) userUpdates.photoUrl = options.photoUrl;
  if (options.phone !== undefined) userUpdates.phone = options.phone;
  if (options.email !== undefined) userUpdates.email = options.email;

  if (Object.keys(userUpdates).length > 1) {
    await adminDb.collection("users").doc(uid).update(stripUndefined(userUpdates));
  }

  const authUpdates: {
    displayName?: string;
    photoURL?: string | null;
    email?: string;
  } = {};
  if (options.displayName !== undefined) authUpdates.displayName = options.displayName;
  if (options.contactName !== undefined) authUpdates.displayName = options.contactName;
  if (options.photoUrl !== undefined) authUpdates.photoURL = options.photoUrl;
  if (options.email !== undefined) authUpdates.email = options.email;
  if (Object.keys(authUpdates).length) {
    await adminAuth.updateUser(uid, authUpdates).catch(() => undefined);
  }

  if (role === "student") {
    const studentUpdates: Record<string, unknown> = { updatedAt: now };
    if (options.displayName !== undefined) studentUpdates.fullName = options.displayName;
    if (options.photoUrl !== undefined) studentUpdates.photoUrl = options.photoUrl;
    if (options.email !== undefined) studentUpdates.email = options.email;
    if (Object.keys(studentUpdates).length > 1) {
      await adminDb
        .collection("students")
        .doc(uid)
        .update(stripUndefined(studentUpdates))
        .catch(() => undefined);
    }
  }

  if (role === "company") {
    const companyUpdates: Record<string, unknown> = { updatedAt: now };
    if (options.companyName !== undefined) companyUpdates.name = options.companyName;
    if (options.contactName !== undefined) companyUpdates.contactName = options.contactName;
    if (options.photoUrl !== undefined) companyUpdates.logoUrl = options.photoUrl;
    if (options.email !== undefined) companyUpdates.contactEmail = options.email;
    if (Object.keys(companyUpdates).length > 1) {
      await adminDb
        .collection("companies")
        .doc(uid)
        .update(stripUndefined(companyUpdates))
        .catch(() => undefined);
    }
  }
}
