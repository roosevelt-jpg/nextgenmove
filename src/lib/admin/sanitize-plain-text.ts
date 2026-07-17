import { looksLikeHtml, stripHtmlToPlainText } from "@/lib/content/plain-text";

/** Recursively convert string fields to plain text (no HTML). Skips email htmlBody. */
export function sanitizePlainTextFields(
  input: Record<string, unknown>,
  options?: { allowHtmlKeys?: string[] },
): Record<string, unknown> {
  const allow = new Set(options?.allowHtmlKeys ?? ["htmlBody"]);

  const walk = (value: unknown, key?: string): unknown => {
    if (typeof value === "string") {
      if (key && allow.has(key)) return value;
      return looksLikeHtml(value) ? stripHtmlToPlainText(value) : value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => walk(item));
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = walk(v, k);
      }
      return out;
    }
    return value;
  };

  return walk(input) as Record<string, unknown>;
}
