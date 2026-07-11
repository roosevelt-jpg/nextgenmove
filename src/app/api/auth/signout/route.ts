import { NextResponse } from "next/server";
import {
  IMPERSONATE_COOKIE_NAME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });

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
