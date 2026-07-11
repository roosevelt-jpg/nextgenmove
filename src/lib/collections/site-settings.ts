import { unstable_cache } from "next/cache";
import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import type {
  CmsFormDocument,
  CmsPageDocument,
  SiteSettingsDocument,
  SocialLink,
} from "@/types/cms";
import { isCmsPageInFooter, isCmsPageInHeader } from "@/lib/public/nav";

const PUBLIC_REVALIDATE_SECONDS = 60;

/** Normalize legacy Record socialLinks and array form into SocialLink[]. */
export function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (Array.isArray(raw)) {
    const links: SocialLink[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const url = String(row.url ?? "").trim();
      if (!url) continue;
      links.push({
        key: String(row.key ?? row.label ?? "link"),
        label: String(row.label ?? row.key ?? ""),
        url,
      });
    }
    return links;
  }

  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, string>)
      .filter(([, url]) => Boolean(url?.trim()))
      .map(([key, url]) => ({ key, label: key, url: url.trim() }));
  }

  return [];
}

async function readSiteSettings(): Promise<SiteSettingsDocument> {
  try {
    const snapshot = await adminDb.collection("site_settings").doc("default").get();
    const data = (snapshot.data() as SiteSettingsDocument | undefined) ?? {};
    return {
      ...data,
      socialLinks: normalizeSocialLinks(data.socialLinks),
    };
  } catch {
    return {};
  }
}

const getSiteSettingsCached = unstable_cache(
  async () => readSiteSettings(),
  ["site-settings-default"],
  {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: ["site_settings", "public-cms"],
  },
);

/** Request-deduped + 60s TTL. Safe for metadata, header, and footer. */
export const getSiteSettings = cache(async () => getSiteSettingsCached());

export async function getPublishedCmsPageBySlug(
  slug: string,
): Promise<CmsPageDocument | null> {
  try {
    const snapshot = await adminDb
      .collection("cms_pages")
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .limit(1)
      .get();

    const doc = snapshot.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...(doc.data() as Omit<CmsPageDocument, "id">) };
  } catch {
    return null;
  }
}

async function readPublishedCmsPages(): Promise<CmsPageDocument[]> {
  try {
    const snapshot = await adminDb
      .collection("cms_pages")
      .where("status", "==", "published")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<CmsPageDocument, "id">),
    }));
  } catch {
    return [];
  }
}

const listPublishedCmsPagesCached = unstable_cache(
  async () => readPublishedCmsPages(),
  ["cms-pages-published"],
  {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: ["cms_pages", "public-cms"],
  },
);

/** Shared published pages list — one Firestore scan per TTL window. */
const listPublishedCmsPages = cache(async () => listPublishedCmsPagesCached());

export const listNavCmsPages = cache(async () => {
  const pages = await listPublishedCmsPages();
  return pages.filter(isCmsPageInHeader);
});

export const listFooterCmsPages = cache(async () => {
  const pages = await listPublishedCmsPages();
  return pages.filter(isCmsPageInFooter);
});

export async function getPublishedCmsFormBySlug(
  slug: string,
): Promise<CmsFormDocument | null> {
  try {
    const snapshot = await adminDb
      .collection("cms_forms")
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .limit(1)
      .get();

    const doc = snapshot.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...(doc.data() as Omit<CmsFormDocument, "id">) };
  } catch {
    return null;
  }
}
