import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";

export interface CorridorCountItem {
  key: string;
  count: number;
}

export interface CorridorIntelligencePayload {
  topSkills: CorridorCountItem[];
  topCities: CorridorCountItem[];
  nationalities: CorridorCountItem[];
  generatedAt: string;
}

function tally(
  map: Map<string, number>,
  raw: unknown,
  normalize = true,
) {
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
): CorridorCountItem[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

async function loadCorridorIntelligence(): Promise<CorridorIntelligencePayload> {
  const skills = new Map<string, number>();
  const cities = new Map<string, number>();
  const nationalities = new Map<string, number>();

  const [jobsSnap, studentsSnap] = await Promise.all([
    adminDb.collection("job_postings").where("status", "==", "open").limit(400).get(),
    adminDb.collection("students").limit(500).get(),
  ]);

  for (const doc of jobsSnap.docs) {
    const data = doc.data();
    tally(skills, data.skills);
    tally(skills, data.tags);
  }

  for (const doc of studentsSnap.docs) {
    const data = doc.data();
    tally(cities, data.currentCity);
    tally(cities, data.targetCities);
    if (data.nationality) {
      tally(nationalities, data.nationality, false);
    }
  }

  return {
    topSkills: topN(skills, 8),
    topCities: topN(cities, 8),
    nationalities: topN(nationalities, 8),
    generatedAt: new Date().toISOString(),
  };
}

export const getCorridorIntelligence = unstable_cache(
  async () => {
    try {
      return await loadCorridorIntelligence();
    } catch {
      return {
        topSkills: [],
        topCities: [],
        nationalities: [],
        generatedAt: new Date().toISOString(),
      } satisfies CorridorIntelligencePayload;
    }
  },
  ["corridor-intelligence-v1"],
  { revalidate: 120, tags: ["corridor-intelligence", "public-cms"] },
);
