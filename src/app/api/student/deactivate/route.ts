import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";

export async function POST() {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  await adminDb
    .collection("users")
    .doc(session.user.uid)
    .update(stripUndefined({ status: "suspended" }));

  return NextResponse.json({ ok: true });
}
