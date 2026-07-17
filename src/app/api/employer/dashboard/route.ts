import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

const TALENT_POOL_SOURCES = [
  "admin_curated",
  "company_browsed",
  "role_interest_promoted",
] as const;

export async function GET() {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  try {
    const [matchesSnapshot, talentSnapshot, stagesSnapshot] = await Promise.all([
      withTimeout(
        adminDb
          .collection("matches")
          .where("companyId", "==", session.companyId)
          .get(),
        4000,
        "employer_dashboard_matches",
      ),
      withTimeout(
        adminDb
          .collection("matches")
          .where("companyId", "==", session.companyId)
          .where("source", "in", [...TALENT_POOL_SOURCES])
          .get(),
        4000,
        "employer_dashboard_talent",
      ),
      withTimeout(
        adminDb.collection("pipeline_stages").get(),
        4000,
        "employer_dashboard_stages",
      ),
    ]);

    let shortlisted = 0;
    let inPipeline = 0;
    const byStage: Record<string, number> = {};

    for (const doc of matchesSnapshot.docs) {
      const data = doc.data();
      if (data.shortlisted) shortlisted += 1;
      if (data.stageId) {
        inPipeline += 1;
        const stageId = String(data.stageId);
        byStage[stageId] = (byStage[stageId] ?? 0) + 1;
      }
    }

    const stageBreakdown = stagesSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: String(data.name ?? doc.id),
          order: Number(data.order ?? 0),
          color: String(data.color ?? "#4b3f9c"),
          count: byStage[doc.id] ?? 0,
        };
      })
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({
      company: {
        name: session.company.name,
        plan: session.company.plan,
        subscriptionStatus: session.company.subscriptionStatus,
      },
      stats: {
        talentPool: talentSnapshot.size,
        shortlisted,
        inPipeline,
      },
      stageBreakdown,
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
      stageBreakdown: [],
      degraded: true,
    });
  }
}
