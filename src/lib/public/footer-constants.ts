/** Hardcoded public footer lines — not CMS-editable. */
export const FOOTER_ATTRIBUTION_PREFIX = "Made with ❤️ by";
export const FOOTER_ATTRIBUTION_NAME = "FLYN.AI";
export const FOOTER_ATTRIBUTION_URL = "https://myflynai.com/";

export function formatFooterCopyright(siteName: string, year = new Date().getFullYear()) {
  const name = siteName.trim() || "Nextgenmove";
  return `© ${year} ${name}`;
}
