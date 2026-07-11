import { NextResponse, type NextRequest } from "next/server";
import {
  IMPERSONATE_COOKIE_NAME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";

function clearAuthCookies(response: NextResponse) {
  const clear = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };

  response.cookies.set(SESSION_COOKIE_NAME, "", clear);
  response.cookies.set(ROLE_COOKIE_NAME, "", clear);
  response.cookies.set(IMPERSONATE_COOKIE_NAME, "", clear);
  return response;
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/sign-in";
  }
  return raw;
}

/** Browser-friendly clear + redirect — breaks auth redirect loops. */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  return clearAuthCookies(NextResponse.redirect(new URL(next, request.url)));
}

export async function POST() {
  return clearAuthCookies(NextResponse.json({ ok: true }));
}
