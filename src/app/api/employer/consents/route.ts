import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

/** Consent timeline for the signed-in company owner. */
export async function GET(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  return withRequestLog(
    request,
    { route: "/api/employer/consents", userId: session.user.uid },
    async () => {
      const snap = await adminDb
        .collection("consent_records")
        .where("userId", "==", session.user.uid)
        .get();

      const records = snap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: String(data.userId ?? ""),
            source: String(data.source ?? ""),
            requiredProcessing: Boolean(data.requiredProcessing),
            requiredProcessingAt: serializeTimestamp(data.requiredProcessingAt),
            marketing: Boolean(data.marketing),
            marketingAt: serializeTimestamp(data.marketingAt),
            createdAt: serializeTimestamp(data.createdAt),
          };
        })
        .sort((a, b) => {
          const aT = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bT = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bT - aT;
        });

      return NextResponse.json({ records });
    },
  );
}
