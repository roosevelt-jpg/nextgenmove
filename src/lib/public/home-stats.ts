import { unstable_cache } from "next/cache";
import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import type { StatBlock } from "@/types/cms";

export type HomeStatMetric =
  | "active_students"
  | "active_companies"
  | "placed_this_quarter"
  | "placed_this_year"
  | "avg_time_to_place"
  | "origin_cities"
  | "manual";

export interface PublicHomeMetrics {
  activeStudents: number;
  activeCompanies: number;
  placedThisQuarter: number;
  placedThisYear: number;
  avgTimeToPlaceDays: number | null;
  originCities: number;
}

async function countActiveByStageIds(stageIds: string[]): Promise<number> {
  if (stageIds.length === 0) return 0;
  const snaps = await Promise.all(
    stageIds.map((stageId) =>
      adminDb
        .collection("matches")
        .where("stageId", "==", stageId)
        .count()
        .get(),
    ),
  );
  return snaps.reduce((sum, snap) => sum + snap.data().count, 0);
}

/**
 * Public marketing metrics. Uses count aggregations only — never loads the
 * full `matches` collection (that burned Firestore read quota on every GET /).
 */
async function readPublicHomeMetrics(
  originCityCount = 0,
): Promise<PublicHomeMetrics> {
  try {
    const [activeStudentsSnap, activeCompaniesSnap, stagesSnap] =
      await Promise.all([
        adminDb.collection("students").where("status", "==", "active").count().get(),
        adminDb
          .collection("companies")
          .where("subscriptionStatus", "==", "active")
          .count()
          .get(),
        adminDb.collection("pipeline_stages").get(),
      ]);

    const terminalStageIds = stagesSnap.docs
      .filter((doc) => Boolean(doc.data().isTerminal))
      .map((doc) => doc.id);
    if (terminalStageIds.length === 0) {
      terminalStageIds.push("pipeline_placed");
    }

    // Placed counts via aggregation (1 read per stage id, not O(matches)).
    // Without a date-indexed query we treat current placed as year/quarter
    // totals — accurate while the CRM is young; refine later with site_metrics.
    const placedTotal = await countActiveByStageIds(terminalStageIds);

    return {
      activeStudents: activeStudentsSnap.data().count,
      activeCompanies: activeCompaniesSnap.data().count,
      placedThisQuarter: placedTotal,
      placedThisYear: placedTotal,
      avgTimeToPlaceDays: null,
      originCities: originCityCount,
    };
  } catch {
    return {
      activeStudents: 0,
      activeCompanies: 0,
      placedThisQuarter: 0,
      placedThisYear: 0,
      avgTimeToPlaceDays: null,
      originCities: originCityCount,
    };
  }
}

const getPublicHomeMetricsCached = unstable_cache(
  async (originCityCount: number) => readPublicHomeMetrics(originCityCount),
  ["public-home-metrics"],
  {
    revalidate: 60,
    tags: ["public-home-metrics", "public-cms"],
  },
);

export const getPublicHomeMetrics = cache(async (originCityCount = 0) =>
  getPublicHomeMetricsCached(originCityCount),
);

function formatMetricValue(
  metric: HomeStatMetric | undefined,
  metrics: PublicHomeMetrics,
  fallback: string,
  suffix?: string,
): string {
  const end = suffix ?? "";
  switch (metric) {
    case "active_students":
      return `${metrics.activeStudents}${end}`;
    case "active_companies":
      return `${metrics.activeCompanies}${end}`;
    case "placed_this_quarter":
      return `${metrics.placedThisQuarter}${end}`;
    case "placed_this_year":
      return `${metrics.placedThisYear}${end}`;
    case "avg_time_to_place":
      return metrics.avgTimeToPlaceDays != null
        ? `${metrics.avgTimeToPlaceDays}${end || "d"}`
        : fallback || "—";
    case "origin_cities":
      return `${metrics.originCities}${end}`;
    case "manual":
    default:
      return fallback;
  }
}

/** Resolve CMS stat labels with live metric values when `metric` is set. */
export function resolveHomeStatBlocks(
  blocks: StatBlock[] | undefined,
  metrics: PublicHomeMetrics,
): StatBlock[] {
  if (!blocks?.length) return [];
  return blocks.map((block) => ({
    ...block,
    value: formatMetricValue(
      block.metric,
      metrics,
      block.value,
      block.suffix,
    ),
  }));
}

/** Replace `{year}` and outdated 4-digit years in CMS badge strings. */
export function applyCurrentYearToken(value: string | undefined): string | undefined {
  if (!value) return value;
  const year = String(new Date().getFullYear());
  return value
    .replaceAll("{year}", year)
    .replace(/\b(20\d{2})\b/g, year);
}
