import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  recomputeCompanyMatchScores,
  recomputeStudentMatchScores,
} from "@/lib/matching/recompute";
import { withRequestLog } from "@/lib/observability/api-handler";

/**
 * Nightly/ops recompute of match scores (blueprint §5.1).
 * Protect with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/cron/recompute-match-scores" }, async () => {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = request.headers.get("authorization") ?? "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const [companiesSnap, studentsSnap] = await Promise.all([
      adminDb.collection("companies").limit(200).get(),
      adminDb.collection("students").limit(500).get(),
    ]);

    let companiesUpdated = 0;
    let studentsUpdated = 0;

    for (const doc of companiesSnap.docs) {
      companiesUpdated += await recomputeCompanyMatchScores(doc.id);
    }
    for (const doc of studentsSnap.docs) {
      studentsUpdated += await recomputeStudentMatchScores(doc.id);
    }

    return NextResponse.json({
      ok: true,
      matchRowsTouched: companiesUpdated + studentsUpdated,
    });
  });
}
