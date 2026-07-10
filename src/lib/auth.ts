import { adminAuth, adminDb } from './firebase-admin';
import { cookies } from 'next/headers';

export type UserRole = 'admin' | 'company' | 'student';

export interface CurrentUser {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
  photoUrl: string | null;
}

/**
 * Server-side helper to get the current user from session cookie.
 * Returns null if not authenticated or role cannot be determined.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return null;
    }

    // Verify the session cookie with Firebase Admin SDK
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Fetch the user document to get the role
    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();

    return {
      uid: decodedClaims.uid,
      email: userData?.email || null,
      role: userData?.role || 'student',
      displayName: userData?.displayName || null,
      photoUrl: userData?.photoUrl || null,
    };
  } catch (error) {
    console.error('[v0] getCurrentUser error:', error);
    return null;
  }
}

/**
 * Check if user has a specific role (server-side).
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === requiredRole;
}

/**
 * Check if user has any of the specified roles (server-side).
 */
export async function hasAnyRole(requiredRoles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? requiredRoles.includes(user.role) : false;
}
