import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";

export const dynamic = "force-dynamic";

function serializeDoc(
  id: string,
  data: FirebaseFirestore.DocumentData,
): Record<string, unknown> {
  const output: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      output[key] = serializeTimestamp(value as FirebaseFirestore.Timestamp);
    } else {
      output[key] = value;
    }
  }

  return output;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { uid } = await context.params;
  if (!uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const userData = userSnap.data()!;
    const user = serializeDoc(userSnap.id, userData);
    user.uid = userData.uid ?? uid;

    const role = String(userData.role ?? "");
    let profile: Record<string, unknown> | null = null;
    let profileKind: "student" | "company" | null = null;

    if (role === "student") {
      const studentSnap = await adminDb.collection("students").doc(uid).get();
      if (studentSnap.exists) {
        profile = serializeDoc(studentSnap.id, studentSnap.data()!);
        profileKind = "student";
      }
    } else if (role === "company" || role === "employer") {
      const companySnap = await adminDb.collection("companies").doc(uid).get();
      if (companySnap.exists) {
        profile = serializeDoc(companySnap.id, companySnap.data()!);
        profileKind = "company";
      }
    }

    return NextResponse.json({
      user,
      profile,
      profileKind,
    });
  } catch (error) {
    console.error(
      "admin_user_profile_failed",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
