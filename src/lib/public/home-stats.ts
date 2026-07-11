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

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function quarterStart(date = new Date()): Date {
  const month = date.getUTCMonth();
  const quarterMonth = month - (month % 3);
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1));
}

export async function getPublicHomeMetrics(
  originCityCount = 0,
): Promise<PublicHomeMetrics> {
  try {
    const [activeStudentsSnap, activeCompaniesSnap, stagesSnap, matchesSnap] =
      await Promise.all([
        adminDb.collection("students").where("status", "==", "active").count().get(),
        adminDb
          .collection("companies")
          .where("subscriptionStatus", "==", "active")
          .count()
          .get(),
        adminDb.collection("pipeline_stages").get(),
        adminDb.collection("matches").get(),
      ]);

    const terminalStageIds = new Set(
      stagesSnap.docs
        .filter((doc) => Boolean(doc.data().isTerminal))
        .map((doc) => doc.id),
    );
    if (terminalStageIds.size === 0) {
      terminalStageIds.add("pipeline_placed");
    }

    const startQ = quarterStart();
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    let placedThisQuarter = 0;
    let placedThisYear = 0;
    const placeDurations: number[] = [];

    for (const doc of matchesSnap.docs) {
      const data = doc.data();
      const stageId = String(data.stageId ?? "");
      if (!terminalStageIds.has(stageId)) continue;

      const updatedAt = toDate(data.updatedAt) ?? toDate(data.createdAt);
      const createdAt = toDate(data.createdAt);

      if (updatedAt && updatedAt >= startQ) placedThisQuarter += 1;
      if (updatedAt && updatedAt >= yearStart) placedThisYear += 1;

      if (createdAt && updatedAt) {
        const days =
          (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) placeDurations.push(days);
      }
    }

    const avgTimeToPlaceDays =
      placeDurations.length > 0
        ? Math.round(
            placeDurations.reduce((sum, value) => sum + value, 0) /
              placeDurations.length,
          )
        : null;

    return {
      activeStudents: activeStudentsSnap.data().count,
      activeCompanies: activeCompaniesSnap.data().count,
      placedThisQuarter,
      placedThisYear,
      avgTimeToPlaceDays,
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
