import { adminDb } from "@/lib/firebase-admin";
import type { TaxonomiesDocument } from "@/types/cms";

export async function getTaxonomies(): Promise<TaxonomiesDocument> {
  try {
    const snapshot = await adminDb.collection("taxonomies").doc("default").get();
    return (snapshot.data() as TaxonomiesDocument | undefined) ?? {};
  } catch {
    return {};
  }
}

export function getTaxonomyLabel(
  taxonomies: TaxonomiesDocument,
  key: keyof TaxonomiesDocument,
  value: string,
): string {
  const options = taxonomies[key];

  if (!Array.isArray(options)) {
    return value;
  }

  return options.find((option) => option.value === value)?.label ?? value;
}
