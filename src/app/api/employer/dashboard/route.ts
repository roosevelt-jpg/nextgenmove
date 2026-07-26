import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { resolveStageColor } from "@/lib/pipeline-colors";

const TALENT_POOL_SOURCES = new Set([
  "admin_curated",
  "company_browsed",
  "role_interest_promoted",
]);

export async function GET() {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const companyPayload = {
    name: session.company.name,
    plan: session.company.plan,
    subscriptionStatus: session.company.subscriptionStatus,
  };

  try {
    // Single matches query — compute all stats in memory (avoids composite
    // companyId+source index failures wiping the whole dashboard).
    const [matchesResult, stagesResult] = await Promise.allSettled([
      withTimeout(
        adminDb
          .collection("matches")
          .where("companyId", "==", session.companyId)
          .get(),
        4000,
        "employer_dashboard_matches",
      ),
      withTimeout(
        adminDb.collection("pipeline_stages").get(),
        4000,
        "employer_dashboard_stages",
      ),
    ]);

    const matchesSnapshot =
      matchesResult.status === "fulfilled" ? matchesResult.value : null;
    const stagesSnapshot =
      stagesResult.status === "fulfilled" ? stagesResult.value : null;

    if (!matchesSnapshot) {
      console.error(
        "employer_dashboard_matches_failed",
        matchesResult.status === "rejected" ? matchesResult.reason : null,
      );
    }
    if (!stagesSnapshot) {
      console.error(
        "employer_dashboard_stages_failed",
        stagesResult.status === "rejected" ? stagesResult.reason : null,
      );
    }

    let shortlisted = 0;
    let inPipeline = 0;
    let talentPool = 0;
    const byStage: Record<string, number> = {};

    if (matchesSnapshot) {
      for (const doc of matchesSnapshot.docs) {
        const data = doc.data();
        const source = String(data.source ?? "");
        if (TALENT_POOL_SOURCES.has(source)) {
          talentPool += 1;
        }
        if (data.shortlisted) shortlisted += 1;
        if (data.stageId) {
          inPipeline += 1;
          const stageId = String(data.stageId);
          byStage[stageId] = (byStage[stageId] ?? 0) + 1;
        }
      }
    }

    const stageBreakdown = (stagesSnapshot?.docs ?? [])
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: String(data.name ?? doc.id),
          order: Number(data.order ?? 0),
          color: String(data.color ?? ""),
          count: byStage[doc.id] ?? 0,
        };
      })
      .sort((a, b) => a.order - b.order)
      .map((stage, index) => ({
        ...stage,
        color: resolveStageColor(stage.color, index),
      }));

    const degraded = !matchesSnapshot || !stagesSnapshot;

    return NextResponse.json({
      company: companyPayload,
      stats: {
        talentPool,
        shortlisted,
        inPipeline,
      },
      stageBreakdown,
      ...(degraded ? { degraded: true } : {}),
    });
  } catch (error) {
    console.error("employer_dashboard_failed", error);
    return NextResponse.json({
      company: companyPayload,
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
