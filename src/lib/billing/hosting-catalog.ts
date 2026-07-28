import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
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

export async function ensureHostingCatalogSeeded(): Promise<void> {
  const ref = adminDb.collection("hosting_plans").doc("default");
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set(
    stripUndefined({
      ...DEFAULT_HOSTING_CATALOG,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );
}
