import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  IMPERSONATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifyImpersonationToken } from "@/lib/auth/impersonation-token";
import type { CurrentUser, UserDocument, UserRole } from "@/types/user";

export type { CurrentUser, UserRole } from "@/types/user";

function mapUserDoc(
  data: UserDocument,
  emailFallback: string | null | undefined,
  extras?: Pick<CurrentUser, "actorUid" | "sessionMode">,
): CurrentUser {
  return {
    uid: data.uid,
    email: emailFallback ?? data.email ?? null,
    role: data.role,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    status: data.status,
    actorUid: extras?.actorUid,
    sessionMode: extras?.sessionMode ?? "live",
  };
}

/**
 * Resolves the Firebase session cookie to the signed-in actor (never the
 * impersonation subject). Used by admin APIs and audit.
 */
export async function getSessionActor(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userSnapshot = await adminDb.collection("users").doc(decoded.uid).get();

    if (!userSnapshot.exists) {
      return null;
    }

    const data = userSnapshot.data() as UserDocument;

    if (data.status === "suspended") {
      return null;
    }

    return mapUserDoc(data, decoded.email, { sessionMode: "live" });
  } catch {
    return null;
  }
}

/**
 * Effective portal user: subject when an admin is impersonating, otherwise actor.
 * Admins without impersonation keep role=admin (portals use preview sessions).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const actor = await getSessionActor();
  if (!actor) {
    return null;
  }

  if (actor.role !== "admin") {
    return actor;
  }

  const cookieStore = await cookies();
  const impersonateCookie = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
  if (!impersonateCookie) {
    return actor;
  }

  const imp = await verifyImpersonationToken(impersonateCookie);
  if (!imp || imp.actorUid !== actor.uid) {
    return actor;
  }

  const subjectSnap = await adminDb.collection("users").doc(imp.subjectUid).get();
  if (!subjectSnap.exists) {
    return actor;
  }

  const subject = subjectSnap.data() as UserDocument;
  if (subject.status === "suspended") {
    return actor;
  }

  if (subject.role !== "student" && subject.role !== "company") {
    return actor;
  }

  return mapUserDoc(subject, subject.email, {
    actorUid: actor.uid,
    sessionMode: "impersonation",
  });
}

export function hasRole(
  user: Pick<CurrentUser, "role"> | null,
  ...roles: UserRole[]
): boolean {
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}
