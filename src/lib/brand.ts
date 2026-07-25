/** Brand asset paths — CMS Storage URLs win; public/brand is fallback only. */

export const BRAND_LOGO_PATH = "/brand/nextgenmove-logo.png";
export const BRAND_ICON_PATH = "/brand/nextgenmove-favicon.png";
export const BRAND_FAVICON_PATH = BRAND_ICON_PATH;

function pickCmsUrl(cmsUrl?: string | null): string | null {
  const trimmed = typeof cmsUrl === "string" ? cmsUrl.trim() : "";
  return trimmed || null;
}

/** Prefer CMS-uploaded logo; fall back to committed public brand asset. */
export function resolveBrandLogoUrl(cmsUrl?: string | null): string {
  return pickCmsUrl(cmsUrl) ?? BRAND_LOGO_PATH;
}

/** Prefer CMS-uploaded icon; fall back to committed public brand asset. */
export function resolveBrandIconUrl(cmsUrl?: string | null): string {
  return pickCmsUrl(cmsUrl) ?? BRAND_ICON_PATH;
}

/** Prefer CMS-uploaded favicon; fall back to committed public brand asset. */
export function resolveBrandFaviconUrl(cmsUrl?: string | null): string {
  return pickCmsUrl(cmsUrl) ?? BRAND_FAVICON_PATH;
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
