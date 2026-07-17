/**
 * Strip HTML tags and decode common entities for plain-text CMS fields.
 */
export function stripHtmlToPlainText(input: string | null | undefined): string {
  if (!input) return "";
  let text = String(input);
  // Preserve paragraph / break structure as newlines before stripping tags.
  text = text
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*\/\s*div\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

/** True when a string looks like it contains HTML markup. */
export function looksLikeHtml(input: string | null | undefined): boolean {
  if (!input) return false;
  return /<\/?[a-z][\s\S]*>/i.test(input);
}
