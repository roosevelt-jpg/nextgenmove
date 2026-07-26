/** Hardcoded NextGen Move brand assets (public/brand). */

export const BRAND_LOGO_PATH = "/brand/nextgenmove-logo.png";
export const BRAND_ICON_PATH = "/brand/nextgenmove-logo.png";
export const BRAND_FAVICON_PATH = "/brand/nextgenmove-favicon.png";

/** Always use the hardcoded logo for chrome (header / footer / sidebars). */
export function resolveBrandLogoUrl(_cmsUrl?: string | null): string {
  return BRAND_LOGO_PATH;
}

/** Always use the hardcoded logo for chrome (header / footer / sidebars). */
export function resolveBrandIconUrl(_cmsUrl?: string | null): string {
  return BRAND_LOGO_PATH;
}

/** Favicon may still come from CMS when set; otherwise use the static asset. */
export function resolveBrandFaviconUrl(cmsUrl?: string | null): string {
  const trimmed = typeof cmsUrl === "string" ? cmsUrl.trim() : "";
  return trimmed || BRAND_FAVICON_PATH;
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
