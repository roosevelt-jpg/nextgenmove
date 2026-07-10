import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  PORTAL_HOME,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRES_IN_MS,
} from "@/lib/auth/constants";
import { signRoleToken } from "@/lib/auth/role-token";
import { stripUndefined } from "@/lib/stripUndefined";
import type { UserDocument } from "@/types/user";

const sessionSchema = z.object({
  idToken: z.string().min(1),
});

function buildCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: Math.floor(maxAgeMs / 1000),
    path: "/",
  };
}

export async function POST(request: Request) {
  try {
    const { idToken } = sessionSchema.parse(await request.json());
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnapshot = await adminDb.collection("users").doc(decoded.uid).get();

    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const user = userSnapshot.data() as UserDocument;

    if (user.status === "suspended") {
      return NextResponse.json({ error: "account_suspended" }, { status: 403 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });
    const roleToken = await signRoleToken({
      uid: user.uid,
      role: user.role,
    });

    await adminDb
      .collection("users")
      .doc(user.uid)
      .update(stripUndefined({ lastLoginAt: FieldValue.serverTimestamp() }));

    const response = NextResponse.json({
      role: user.role,
      redirectTo: PORTAL_HOME[user.role],
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie,
      buildCookieOptions(SESSION_EXPIRES_IN_MS),
    );
    response.cookies.set(
      ROLE_COOKIE_NAME,
      roleToken,
      buildCookieOptions(SESSION_EXPIRES_IN_MS),
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("session_failed", error);
    return NextResponse.json({ error: "session_failed" }, { status: 401 });
  }
}
