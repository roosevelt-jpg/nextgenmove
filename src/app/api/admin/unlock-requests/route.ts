import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { PROFILE_UNLOCK_TYPE } from "@/lib/employer/profile-unlock";
import { anonymizedDisplayName } from "@/lib/employer/student-visibility";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const snap = await adminDb
      .collection("requests")
      .where("type", "==", PROFILE_UNLOCK_TYPE)
      .get();

    const items = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const companyId = String(data.companyId ?? "");
        const studentId = String(data.studentId ?? "");
        const [companySnap, studentSnap] = await Promise.all([
          companyId
            ? adminDb.collection("companies").doc(companyId).get()
            : Promise.resolve(null),
          studentId
            ? adminDb.collection("students").doc(studentId).get()
            : Promise.resolve(null),
        ]);

        return {
          id: doc.id,
          companyId,
          studentId,
          matchId: data.matchId ? String(data.matchId) : null,
          status: String(data.status ?? "pending"),
          note: data.note ? String(data.note) : null,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
          resolvedAt: data.resolvedAt?.toDate?.()?.toISOString?.() ?? null,
          resolvedBy: data.resolvedBy ? String(data.resolvedBy) : null,
          companyName:
            companySnap?.data()?.name ??
            data.payload?.companyName ??
            companyId,
          candidateLabel:
            data.payload?.candidateLabel ??
            anonymizedDisplayName(studentId),
          studentFullName: studentSnap?.data()?.fullName ?? "",
        };
      }),
    );

    items.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("admin_unlock_requests_list_failed", error);
    return NextResponse.json({ items: [] });
  }
}
