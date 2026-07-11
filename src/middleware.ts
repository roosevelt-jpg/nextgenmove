import { NextResponse, type NextRequest } from "next/server";
import {
  getRequiredRoleForPath,
  isAuthPath,
  PORTAL_HOME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  roleMayAccessPortalPath,
} from "@/lib/auth/constants";
import { verifyRoleToken } from "@/lib/auth/role-token";
import {
  IMPERSONATE_COOKIE_NAME,
  verifyImpersonationToken,
} from "@/lib/auth/impersonation-token";

const CLEAR_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 0,
  path: "/",
};

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", CLEAR_COOKIE);
  response.cookies.set(ROLE_COOKIE_NAME, "", CLEAR_COOKIE);
  response.cookies.set(IMPERSONATE_COOKIE_NAME, "", CLEAR_COOKIE);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRoleForPath(pathname);
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const roleToken = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  if (isAuthPath(pathname)) {
    // Only bounce signed-in users away when BOTH cookies exist and the role
    // JWT verifies. A lone/stale __ngm_role cookie caused sign-in ↔ portal loops.
    if (roleToken && sessionCookie) {
      const payload = await verifyRoleToken(roleToken);
      if (payload) {
        return NextResponse.redirect(
          new URL(PORTAL_HOME[payload.role], request.url),
        );
      }
    }

    const response = NextResponse.next();
    if (roleToken && !sessionCookie) {
      response.cookies.set(ROLE_COOKIE_NAME, "", CLEAR_COOKIE);
      response.cookies.set(IMPERSONATE_COOKIE_NAME, "", CLEAR_COOKIE);
    } else if (roleToken) {
      const payload = await verifyRoleToken(roleToken);
      if (!payload) {
        response.cookies.set(ROLE_COOKIE_NAME, "", CLEAR_COOKIE);
        response.cookies.set(IMPERSONATE_COOKIE_NAME, "", CLEAR_COOKIE);
      }
    }
    return response;
  }

  if (!requiredRole) {
    return NextResponse.next();
  }

  if (!sessionCookie || !roleToken) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(signInUrl);
    // Drop orphan role cookie so /sign-in does not bounce back to the portal.
    if (roleToken && !sessionCookie) {
      clearAuthCookies(response);
    }
    return response;
  }

  const payload = await verifyRoleToken(roleToken);

  if (!payload) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return clearAuthCookies(NextResponse.redirect(signInUrl));
  }

  let subjectRole: typeof payload.role | null = null;
  const impersonateCookie = request.cookies.get(IMPERSONATE_COOKIE_NAME)?.value;
  if (impersonateCookie && payload.role === "admin") {
    const imp = await verifyImpersonationToken(impersonateCookie);
    if (imp && imp.actorUid === payload.uid) {
      subjectRole = imp.subjectRole;
    }
  }

  // Admin routes always require the real admin actor (not the impersonated subject).
  if (requiredRole === "admin") {
    if (payload.role !== "admin") {
      return NextResponse.redirect(
        new URL(PORTAL_HOME[payload.role], request.url),
      );
    }
    return NextResponse.next();
  }

  const allowed = roleMayAccessPortalPath(payload.role, pathname, {
    subjectRole,
  });

  if (!allowed) {
    const homeRole = subjectRole ?? payload.role;
    return NextResponse.redirect(new URL(PORTAL_HOME[homeRole], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/employer",
    "/employer/:path*",
    "/student",
    "/student/:path*",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
  ],
};
