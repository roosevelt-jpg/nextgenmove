import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const ms = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds: number })._seconds === "number"
  ) {
    return (value as { _seconds: number })._seconds * 1000;
  }
  return null;
}

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/employer/roi" }, async () => {
    const session = await getEmployerSession();
    if (!session) return unauthorizedResponse();

    const companyId = session.companyId;

    const [matchesSnap, escrowsSnap, sprintsSnap, reservationsSnap] =
      await Promise.all([
        adminDb
          .collection("matches")
          .where("companyId", "==", companyId)
          .get(),
        adminDb
          .collection("credit_escrows")
          .where("partyId", "==", companyId)
          .where("party", "==", "company")
          .get(),
        adminDb
          .collection("shadow_sprints")
          .where("companyId", "==", companyId)
          .get(),
        adminDb
          .collection("bench_reservations")
          .where("companyId", "==", companyId)
          .get(),
      ]);

    const hiredMatches = matchesSnap.docs.filter((doc) => {
      const status = String(doc.data()?.applicationStatus ?? "").toLowerCase();
      return status === "hired";
    });

    const hireDays: number[] = [];
    for (const doc of hiredMatches) {
      const data = doc.data();
      const start = toMillis(data.createdAt);
      const end = toMillis(data.hiredAt) ?? toMillis(data.updatedAt);
      if (start == null || end == null || end < start) continue;
      hireDays.push((end - start) / (1000 * 60 * 60 * 24));
    }

    const avgDaysToHire =
      hireDays.length > 0
        ? Math.round(
            (hireDays.reduce((sum, d) => sum + d, 0) / hireDays.length) * 10,
          ) / 10
        : null;

    let dualCommitLocked = 0;
    let dualCommitReleased = 0;
    for (const doc of escrowsSnap.docs) {
      const status = String(doc.data()?.status ?? "");
      if (status === "locked") dualCommitLocked += 1;
      if (status === "released") dualCommitReleased += 1;
    }

    let sprintGo = 0;
    let sprintNoGo = 0;
    let sprintFinal = 0;
    for (const doc of sprintsSnap.docs) {
      const status = String(doc.data()?.status ?? "");
      if (status === "go") {
        sprintGo += 1;
        sprintFinal += 1;
      } else if (status === "no_go") {
        sprintNoGo += 1;
        sprintFinal += 1;
      }
    }

    let reservationsTotal = 0;
    let reservationsConverted = 0;
    for (const doc of reservationsSnap.docs) {
      reservationsTotal += 1;
      if (String(doc.data()?.status ?? "") === "converted") {
        reservationsConverted += 1;
      }
    }

    return NextResponse.json({
      companyId,
      hireCount: hiredMatches.length,
      avgDaysToHire,
      avgDaysToHireSampleSize: hireDays.length,
      dualCommit: {
        locked: dualCommitLocked,
        released: dualCommitReleased,
      },
      shadowSprints: {
        go: sprintGo,
        noGo: sprintNoGo,
        finalCount: sprintFinal,
        goRate:
          sprintFinal > 0
            ? Math.round((sprintGo / sprintFinal) * 1000) / 10
            : null,
        noGoRate:
          sprintFinal > 0
            ? Math.round((sprintNoGo / sprintFinal) * 1000) / 10
            : null,
      },
      benchReservations: {
        total: reservationsTotal,
        converted: reservationsConverted,
        convertRate:
          reservationsTotal > 0
            ? Math.round((reservationsConverted / reservationsTotal) * 1000) / 10
            : null,
      },
    });
  });
}
