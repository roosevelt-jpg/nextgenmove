import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import type {
  CmsFormDocument,
  CmsPageDocument,
  SiteSettingsDocument,
  SocialLink,
} from "@/types/cms";
import { isCmsPageInFooter, isCmsPageInHeader } from "@/lib/public/nav";
import { cachedPublicCms } from "@/lib/public/cms-cache";
import { FALLBACK_SITE_SETTINGS } from "@/lib/public/cms-fallbacks";
import { serializeForClient } from "@/lib/firestore-utils";
import { isPubliclyPublished } from "@/lib/cms/publish-visibility";

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

async function loadSiteSettings(): Promise<SiteSettingsDocument> {
  const snapshot = await adminDb.collection("site_settings").doc("default").get();
  const data = (snapshot.data() as SiteSettingsDocument | undefined) ?? {};
  const contactEmail =
    String(data.contactEmail ?? "").trim() || "info@nextgenmove.agency";
  return serializeForClient({
    ...data,
    contactEmail,
    socialLinks: normalizeSocialLinks(data.socialLinks),
  });
}

function isValidSiteSettings(value: SiteSettingsDocument): boolean {
  return Boolean(
    value.siteName?.trim() ||
      value.navLabels?.howItWorks ||
      value.navLabels?.headerCta,
  );
}

/** Request-deduped + TTL. Never caches empty outage responses. */
export const getSiteSettings = cache(async () =>
  cachedPublicCms({
    key: ["site-settings-default"],
    tags: ["site_settings", "public-cms"],
    load: loadSiteSettings,
    isValid: isValidSiteSettings,
    fallback: FALLBACK_SITE_SETTINGS,
  }),
);

function mapCmsPage(
  id: string,
  data: FirebaseFirestore.DocumentData,
): CmsPageDocument {
  return serializeForClient({
    id,
    ...(data as Omit<CmsPageDocument, "id">),
  });
}

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
    const page = mapCmsPage(doc.id, doc.data());
    if (!isPubliclyPublished(page)) return null;
    return page;
  } catch {
    return null;
  }
}

/** Admin preview: load any cms_pages doc by id (draft or scheduled). */
export async function getCmsPageById(
  id: string,
): Promise<CmsPageDocument | null> {
  try {
    const snap = await adminDb.collection("cms_pages").doc(id).get();
    if (!snap.exists) return null;
    return mapCmsPage(snap.id, snap.data()!);
  } catch {
    return null;
  }
}

/** Admin preview by slug — includes drafts / future publishAt. */
export async function getCmsPageBySlugForPreview(
  slug: string,
): Promise<CmsPageDocument | null> {
  try {
    const snapshot = await adminDb
      .collection("cms_pages")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    if (!doc) return null;
    return mapCmsPage(doc.id, doc.data());
  } catch {
    return null;
  }
}

async function loadPublishedCmsPages(): Promise<CmsPageDocument[]> {
  const snapshot = await adminDb
    .collection("cms_pages")
    .where("status", "==", "published")
    .get();

  return snapshot.docs
    .map((doc) => mapCmsPage(doc.id, doc.data()))
    .filter((page) => isPubliclyPublished(page));
}

const listPublishedCmsPages = cache(async () =>
  cachedPublicCms({
    key: ["cms-pages-published"],
    tags: ["cms_pages", "public-cms"],
    load: loadPublishedCmsPages,
    // Empty list can be legitimate — only reject when load throws (handled above).
    isValid: () => true,
    fallback: [],
  }),
);

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
    return serializeForClient({
      id: doc.id,
      ...(doc.data() as Omit<CmsFormDocument, "id">),
    });
  } catch {
    return null;
  }
}
