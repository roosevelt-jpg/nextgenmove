import type { Metadata } from "next";
import type { CmsPageDocument, SiteSettingsDocument } from "@/types/cms";
import { BRAND_FAVICON_PATH } from "@/lib/brand";

/**
 * Prefer the brand PNG. Cache-bust so browsers drop the old Next/Vercel
 * `/favicon.ico` that was generated from the default app icon.
 */
const FAVICON = `${BRAND_FAVICON_PATH}?v=20260712b`;

export function buildRootMetadata(settings: SiteSettingsDocument): Metadata {
  const siteName = settings.siteName?.trim() || undefined;
  const title =
    settings.defaultMetaTitle?.trim() ||
    (siteName && settings.tagline
      ? `${siteName} — ${settings.tagline}`
      : siteName);
  const description =
    settings.defaultMetaDescription?.trim() ||
    settings.siteDescription?.trim() ||
    settings.tagline?.trim() ||
    undefined;

  return {
    title: title
      ? {
          default: title,
          template: siteName ? `%s · ${siteName}` : "%s",
        }
      : undefined,
    description,
    icons: {
      icon: [
        { url: FAVICON, type: "image/png", sizes: "32x32" },
        { url: FAVICON, type: "image/png", sizes: "192x192" },
        { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      ],
      shortcut: [{ url: FAVICON, type: "image/png" }],
      apple: [{ url: FAVICON, type: "image/png" }],
    },
    openGraph: {
      title: title || undefined,
      description,
      siteName,
      type: "website",
    },
  };
}

export function buildCmsPageMetadata(
  page: CmsPageDocument,
  settings: SiteSettingsDocument,
): Metadata {
  const siteName = settings.siteName?.trim();
  const title =
    page.metaTitle?.trim() ||
    page.headline?.trim() ||
    page.title?.trim() ||
    settings.defaultMetaTitle?.trim() ||
    siteName;
  const description =
    page.metaDescription?.trim() ||
    settings.defaultMetaDescription?.trim() ||
    settings.siteDescription?.trim() ||
    settings.tagline?.trim() ||
    undefined;

  return {
    title,
    description,
    openGraph: {
      title: title || undefined,
      description,
      siteName,
      type: "article",
    },
  };
}
