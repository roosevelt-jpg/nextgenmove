import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { CurrentUser, UserDocument, UserRole } from "@/types/user";

export type { CurrentUser, UserRole } from "@/types/user";

export async function getCurrentUser(): Promise<CurrentUser | null> {
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

    return {
      uid: data.uid,
      email: decoded.email ?? data.email ?? null,
      role: data.role,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
      status: data.status,
    };
  } catch {
    return null;
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
