import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  applyCanonicalHostingPricing,
  DEFAULT_HOSTING_CATALOG,
  normalizeHostingCatalog,
  type HostingCatalog,
} from "@/lib/billing/hosting-catalog-shared";

export * from "@/lib/billing/hosting-catalog-shared";

export async function getHostingCatalog(): Promise<HostingCatalog> {
  try {
    const snap = await adminDb.collection("hosting_plans").doc("default").get();
    if (!snap.exists) return DEFAULT_HOSTING_CATALOG;
    return normalizeHostingCatalog(snap.data() as Record<string, unknown>);
  } catch {
    return DEFAULT_HOSTING_CATALOG;
  }
}

/**
 * Seed if missing, and always repair Startup/plan sticker prices to code defaults
 * so checkout cannot drift (Startup stays $29/mo → $348 for 12 months).
 */
export async function ensureHostingCatalogSeeded(): Promise<void> {
  const ref = adminDb.collection("hosting_plans").doc("default");
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(
      stripUndefined({
        ...DEFAULT_HOSTING_CATALOG,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    return;
  }

  const current = normalizeHostingCatalog(
    snap.data() as Record<string, unknown>,
  );
  const repaired = applyCanonicalHostingPricing(current);
  const startup = repaired.plans.find((plan) => plan.id === "startup");
  const existingStartup = current.plans.find((plan) => plan.id === "startup");
  const periodIds = new Set(current.periods.map((period) => period.id));
  const needsRepair =
    !existingStartup ||
    existingStartup.monthlyPrice !== startup?.monthlyPrice ||
    existingStartup.listMonthlyPrice !== startup?.listMonthlyPrice ||
    current.taxRatePercent !== repaired.taxRatePercent ||
    current.defaultPeriodId !== repaired.defaultPeriodId ||
    !periodIds.has("1") ||
    !periodIds.has("12") ||
    !periodIds.has("24") ||
    current.periods.length !== repaired.periods.length;

  if (!needsRepair) return;

  await ref.set(
    stripUndefined({
      ...repaired,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
}
