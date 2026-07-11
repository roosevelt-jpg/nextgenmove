import type { Metadata } from "next";
import type { CmsPageDocument, SiteSettingsDocument } from "@/types/cms";
import { resolveBrandFaviconUrl } from "@/lib/brand";

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

  const favicon = resolveBrandFaviconUrl(settings.faviconUrl);

  return {
    title: title
      ? {
          default: title,
          template: siteName ? `%s · ${siteName}` : "%s",
        }
      : undefined,
    description,
    icons: {
      icon: [{ url: favicon }],
      apple: [{ url: favicon }],
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
