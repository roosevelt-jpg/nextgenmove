import { adminDb } from "@/lib/firebase-admin";
import type { AuthLabels } from "@/types/user";

export async function getAuthLabels(): Promise<AuthLabels> {
  try {
    const doc = await adminDb.collection("site_settings").doc("default").get();
    const authLabels = doc.data()?.authLabels;

    if (authLabels && typeof authLabels === "object") {
      return authLabels as AuthLabels;
    }
  } catch {
    // CMS labels are optional until seeded.
  }

  return {};
}
