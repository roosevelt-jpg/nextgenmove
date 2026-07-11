/** Hardcoded Venturo brand assets (public/). Always preferred over CMS uploads. */

export const BRAND_LOGO_PATH = "/brand/venturo-logo.png";
export const BRAND_ICON_PATH = "/brand/venturo-favicon.png";
export const BRAND_FAVICON_PATH = BRAND_ICON_PATH;

/** Ignore CMS overrides — brand files are committed under /public/brand. */
export function resolveBrandLogoUrl(_cmsUrl?: string | null): string {
  return BRAND_LOGO_PATH;
}

export function resolveBrandIconUrl(_cmsUrl?: string | null): string {
  return BRAND_ICON_PATH;
}

export function resolveBrandFaviconUrl(_cmsUrl?: string | null): string {
  return BRAND_FAVICON_PATH;
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
