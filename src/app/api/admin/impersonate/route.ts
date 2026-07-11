import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { PORTAL_HOME } from "@/lib/auth/constants";
import {
  IMPERSONATE_COOKIE_NAME,
  IMPERSONATE_EXPIRES_IN_MS,
  signImpersonationToken,
} from "@/lib/auth/impersonation-token";
import type { UserDocument } from "@/types/user";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  userId: z.string().min(1),
});

function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAgeSec,
    path: "/",
  };
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = startSchema.parse(await request.json());
    const snap = await adminDb.collection("users").doc(body.userId).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const subject = snap.data() as UserDocument;

    if (subject.status === "suspended") {
      return NextResponse.json({ error: "account_suspended" }, { status: 403 });
    }

    if (subject.role !== "student" && subject.role !== "company") {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }

    const token = await signImpersonationToken({
      actorUid: session.uid,
      subjectUid: subject.uid,
      subjectRole: subject.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(
      IMPERSONATE_COOKIE_NAME,
      token,
      cookieOptions(Math.floor(IMPERSONATE_EXPIRES_IN_MS / 1000)),
    );

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "impersonation_start",
      targetType: "users",
      targetId: subject.uid,
      metadata: { subjectRole: subject.role },
    });

    return NextResponse.json({
      ok: true,
      redirectTo: PORTAL_HOME[subject.role],
      subject: {
        uid: subject.uid,
        displayName: subject.displayName,
        role: subject.role,
        email: subject.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "impersonation_failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
  cookieStore.set(IMPERSONATE_COOKIE_NAME, "", cookieOptions(0));

  await logActivity({
    actorId: session.uid,
    actorRole: session.role,
    action: "impersonation_stop",
    targetType: "users",
    targetId: session.uid,
    metadata: { hadCookie: Boolean(existing) },
  });

  return NextResponse.json({
    ok: true,
    redirectTo: PORTAL_HOME.admin,
  });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ active: false });
  }

  const { verifyImpersonationToken } = await import(
    "@/lib/auth/impersonation-token"
  );
  const imp = await verifyImpersonationToken(token);
  if (!imp || imp.actorUid !== session.uid) {
    return NextResponse.json({ active: false });
  }

  const snap = await adminDb.collection("users").doc(imp.subjectUid).get();
  const data = snap.data() as UserDocument | undefined;

  return NextResponse.json({
    active: true,
    subject: data
      ? {
          uid: data.uid,
          displayName: data.displayName,
          role: data.role,
          email: data.email,
        }
      : { uid: imp.subjectUid, role: imp.subjectRole },
  });
}
