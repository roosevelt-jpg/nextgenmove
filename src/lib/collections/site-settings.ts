import { adminDb } from "@/lib/firebase-admin";
import type { SiteSettingsDocument } from "@/types/cms";

export async function getSiteSettings(): Promise<SiteSettingsDocument> {
  try {
    const snapshot = await adminDb.collection("site_settings").doc("default").get();
    return (snapshot.data() as SiteSettingsDocument | undefined) ?? {};
  } catch {
    return {};
  }
}
