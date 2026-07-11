import { NextResponse, type NextRequest } from "next/server";
import {
  getRequiredRoleForPath,
  isAuthPath,
  PORTAL_HOME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifyRoleToken } from "@/lib/auth/role-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRoleForPath(pathname);

  if (isAuthPath(pathname)) {
    const roleToken = request.cookies.get(ROLE_COOKIE_NAME)?.value;

    if (roleToken) {
      const payload = await verifyRoleToken(roleToken);

      if (payload) {
        return NextResponse.redirect(
          new URL(PORTAL_HOME[payload.role], request.url),
        );
      }
    }

    return NextResponse.next();
  }

  if (!requiredRole) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const roleToken = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  if (!sessionCookie || !roleToken) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const payload = await verifyRoleToken(roleToken);

  if (!payload) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (payload.role !== requiredRole) {
    return NextResponse.redirect(new URL(PORTAL_HOME[payload.role], request.url));
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
