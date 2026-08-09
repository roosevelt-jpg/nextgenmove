import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

/** Recent consent_records for admin compliance locker. */
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

      return NextResponse.json({
        records: records.slice(0, limit),
        anonymizeDocsHref: "/docs/security-model.md",
        anonymizeLibPath: "src/lib/security/anonymize-account.ts",
      });
    },
  );
}
