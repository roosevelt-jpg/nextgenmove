import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

export async function GET() {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  try {
    const matchesSnapshot = await withTimeout(
      adminDb
        .collection("matches")
        .where("companyId", "==", session.companyId)
        .get(),
      4000,
      "employer_dashboard_matches",
    );

    let shortlisted = 0;
    let inPipeline = 0;

    for (const doc of matchesSnapshot.docs) {
      const data = doc.data();
      if (data.shortlisted) shortlisted += 1;
      if (data.stageId) inPipeline += 1;
    }

    return NextResponse.json({
      company: {
        name: session.company.name,
        plan: session.company.plan,
        subscriptionStatus: session.company.subscriptionStatus,
      },
      stats: {
        talentPool: matchesSnapshot.size,
        shortlisted,
        inPipeline,
      },
    });
  } catch {
    return NextResponse.json({
      company: {
        name: session.company.name,
        plan: session.company.plan,
        subscriptionStatus: session.company.subscriptionStatus,
      },
      stats: {
        talentPool: 0,
        shortlisted: 0,
        inPipeline: 0,
      },
      degraded: true,
    });
  }
}
