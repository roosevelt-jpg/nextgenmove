/** Brand asset helpers — CMS Storage URLs only (no baked-in public/brand fallbacks). */

/** @deprecated Kept for docs/scripts; prefer empty CMS URL over static assets. */
export const BRAND_LOGO_PATH = "";
export const BRAND_ICON_PATH = "";
export const BRAND_FAVICON_PATH = "";

function pickCmsUrl(cmsUrl?: string | null): string | null {
  const trimmed = typeof cmsUrl === "string" ? cmsUrl.trim() : "";
  return trimmed || null;
}

/** Prefer CMS-uploaded logo; empty string when unset (no baked-in brand asset). */
export function resolveBrandLogoUrl(cmsUrl?: string | null): string {
  return pickCmsUrl(cmsUrl) ?? "";
}

/** Prefer CMS-uploaded icon; empty string when unset. */
export function resolveBrandIconUrl(cmsUrl?: string | null): string {
  return pickCmsUrl(cmsUrl) ?? "";
}

/** Prefer CMS-uploaded favicon; empty string when unset. */
export function resolveBrandFaviconUrl(cmsUrl?: string | null): string {
  return pickCmsUrl(cmsUrl) ?? "";
}

/** Absolute URL for emails / Open Graph when a public origin is configured. */
export function absoluteBrandAssetUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/$/, "");
  if (!origin) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
