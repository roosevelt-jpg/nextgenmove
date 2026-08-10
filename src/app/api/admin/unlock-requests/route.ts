import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { PROFILE_UNLOCK_TYPE } from "@/lib/employer/profile-unlock";
import { COMPANY_UNLOCK_TYPE } from "@/lib/marketplace/mutual-unlock";
import { anonymizedDisplayName } from "@/lib/employer/student-visibility";
import { anonymizedEmployerLabel } from "@/lib/marketplace/company-visibility";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get("type")?.trim() || "";

    const types =
      typeFilter === PROFILE_UNLOCK_TYPE
        ? [PROFILE_UNLOCK_TYPE]
        : typeFilter === COMPANY_UNLOCK_TYPE
          ? [COMPANY_UNLOCK_TYPE]
          : [PROFILE_UNLOCK_TYPE, COMPANY_UNLOCK_TYPE];

    const snaps = await Promise.all(
      types.map((type) =>
        adminDb.collection("requests").where("type", "==", type).get(),
      ),
    );

    const docs = snaps.flatMap((snap) => snap.docs);

    const items = await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        const type = String(data.type ?? PROFILE_UNLOCK_TYPE);
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
          type,
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
          employerLabel:
            data.payload?.employerLabel ??
            (companyId ? anonymizedEmployerLabel(companyId) : null),
          candidateLabel:
            data.payload?.candidateLabel ??
            anonymizedDisplayName(studentId || "----"),
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
