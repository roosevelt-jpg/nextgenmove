import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";

export interface BenchTeaserCountItem {
  key: string;
  count: number;
}

export interface BenchTeaserPayload {
  readyCount: number;
  corridors: BenchTeaserCountItem[];
  /** Optional safe skill aggregates from ready bench profiles. */
  topSkills: BenchTeaserCountItem[];
  generatedAt: string;
}

function emptyPayload(): BenchTeaserPayload {
  return {
    readyCount: 0,
    corridors: [],
    topSkills: [],
    generatedAt: new Date().toISOString(),
  };
}

function tally(map: Map<string, number>, raw: unknown, normalize = true) {
  if (raw == null) return;
  const values = Array.isArray(raw) ? raw : [raw];
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    const key = normalize ? text.toLowerCase() : text;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}

function topN(
  map: Map<string, number>,
  limit: number,
): BenchTeaserCountItem[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** Prefer corridor / city fields; fall back to nationality. Never PII. */
function corridorKey(data: Record<string, unknown>): string | null {
  const preferredCorridor = String(
    data.preferredCorridor ?? data.corridor ?? "",
  ).trim();
  if (preferredCorridor) return preferredCorridor;

  const preferredCity = String(data.preferredCity ?? "").trim();
  if (preferredCity) return preferredCity;

  if (Array.isArray(data.targetCities) && data.targetCities.length) {
    const first = String(data.targetCities[0] ?? "").trim();
    if (first) return first;
  }

  const currentCity = String(data.currentCity ?? "").trim();
  if (currentCity) return currentCity;

  const nationality = String(data.nationality ?? "").trim();
  return nationality || null;
}

async function loadBenchTeaser(): Promise<BenchTeaserPayload> {
  const corridors = new Map<string, number>();
  const skills = new Map<string, number>();

  const snap = await adminDb
    .collection("students")
    .where("benchStatus", "==", "ready")
    .limit(500)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const key = corridorKey(data);
    if (key) {
      tally(corridors, key, false);
    }
    tally(skills, data.skills);
  }

  return {
    readyCount: snap.size,
    corridors: topN(corridors, 12),
    topSkills: topN(skills, 8),
    generatedAt: new Date().toISOString(),
  };
}

export const getBenchTeaser = unstable_cache(
  async () => {
    try {
      return await loadBenchTeaser();
    } catch {
      return emptyPayload();
    }
  },
  ["bench-teaser-v1"],
  { revalidate: 120, tags: ["bench-teaser", "public-cms"] },
);
