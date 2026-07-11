import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  IMPERSONATE_COOKIE_NAME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifyImpersonationToken } from "@/lib/auth/impersonation-token";
import { verifyRoleToken } from "@/lib/auth/role-token";
import { withTimeout } from "@/lib/async/with-timeout";
import type { CurrentUser, UserDocument, UserRole } from "@/types/user";

export type { CurrentUser, UserRole } from "@/types/user";

const USER_LOOKUP_MS = 5000;

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
    const decoded = await withTimeout(
      adminAuth.verifySessionCookie(sessionCookie, true),
      8000,
      "verify_session",
    );

    try {
      const userSnapshot = await withTimeout(
        adminDb.collection("users").doc(decoded.uid).get(),
        USER_LOOKUP_MS,
        "user_lookup",
      );

      if (userSnapshot.exists) {
        const data = userSnapshot.data() as UserDocument;
        if (data.status === "suspended") {
          return null;
        }
        return mapUserDoc(data, decoded.email, { sessionMode: "live" });
      }
    } catch {
      // Firestore slow/quota — fall through to role cookie.
    }

    // Degraded auth: session cookie is valid; use signed role JWT if present.
    const roleToken = cookieStore.get(ROLE_COOKIE_NAME)?.value;
    if (roleToken) {
      const payload = await verifyRoleToken(roleToken);
      if (payload && payload.uid === decoded.uid) {
        return {
          uid: decoded.uid,
          email: decoded.email ?? null,
          role: payload.role,
          displayName: decoded.name ?? decoded.email ?? "",
          photoUrl: decoded.picture ?? null,
          status: "active",
          sessionMode: "live",
        };
      }
    }

    return null;
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

  try {
    const subjectSnap = await withTimeout(
      adminDb.collection("users").doc(imp.subjectUid).get(),
      USER_LOOKUP_MS,
      "impersonation_subject",
    );
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
  } catch {
    return actor;
  }
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
