import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

/** Recent consent_records + pii_access_events for admin compliance locker. */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  return withRequestLog(
    request,
    { route: "/api/admin/compliance", userId: session.uid },
    async () => {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        200,
        Math.max(1, Number(searchParams.get("limit") ?? 50) || 50),
      );
      const piiLimit = Math.min(
        50,
        Math.max(1, Number(searchParams.get("piiLimit") ?? 50) || 50),
      );

      let snap;
      try {
        snap = await adminDb
          .collection("consent_records")
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get();
      } catch {
        // Fallback when createdAt index/order is unavailable.
        snap = await adminDb.collection("consent_records").limit(limit).get();
      }

      const records = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: String(data.userId ?? ""),
          source: String(data.source ?? ""),
          requiredProcessing: Boolean(data.requiredProcessing),
          marketing: Boolean(data.marketing),
          createdAt: serializeTimestamp(data.createdAt),
        };
      });

      records.sort((a, b) => {
        const aT = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bT = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bT - aT;
      });

      let piiSnap;
      try {
        piiSnap = await adminDb
          .collection("pii_access_events")
          .orderBy("createdAt", "desc")
          .limit(piiLimit)
          .get();
      } catch {
        piiSnap = await adminDb
          .collection("pii_access_events")
          .limit(piiLimit)
          .get();
      }

      const piiAccessEvents = piiSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          actorUid: String(data.actorUid ?? ""),
          studentId: String(data.studentId ?? ""),
          action: String(data.action ?? ""),
          meta:
            data.meta && typeof data.meta === "object"
              ? (data.meta as Record<string, unknown>)
              : null,
          createdAt: serializeTimestamp(data.createdAt),
        };
      });

      piiAccessEvents.sort((a, b) => {
        const aT = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bT = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bT - aT;
      });

      return NextResponse.json({
        records: records.slice(0, limit),
        piiAccessEvents: piiAccessEvents.slice(0, piiLimit),
      });
    },
  );
}
