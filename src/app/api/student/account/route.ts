import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  return NextResponse.json({
    email: session.user.email,
    student: session.student,
  });
}

const accountSchema = z.object({
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
});

export async function PATCH(request: Request) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = accountSchema.parse(await request.json());

    if (body.notificationPreferences) {
      await adminDb
        .collection("students")
        .doc(session.studentId)
        .update(stripUndefined({ notificationPreferences: body.notificationPreferences }));
    }

    const updated = await getStudentSession();
    return NextResponse.json({ student: updated?.student });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("student_account_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
