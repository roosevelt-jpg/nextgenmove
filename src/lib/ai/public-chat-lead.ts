export type PublicChatLeadOffer = "hiring" | "talent";

const HIRING_RE =
  /\b(hir(e|ing)|employer|talent\s*pool|recruit(er|ing)?|sourcing|request\s+talent|staff(ing)?|headcount|open\s+roles?\s+for\s+(our|my)\s+(team|company))\b/i;

const TALENT_RE =
  /\b(relocat(e|ion|ing)?|visa|student|immigra(te|tion)|move\s+abroad|work\s+abroad|corridor|evidence\s+vault|talent\s+(path|journey)|get\s+hired\s+abroad)\b/i;

/**
 * Keyword classifier for public-widget CRM handoff.
 * Prefer hiring when both hit; otherwise the matching intent.
 */
export function detectPublicChatLeadOffer(
  text: string,
): PublicChatLeadOffer | null {
  const raw = text.trim();
  if (!raw) return null;
  const hiring = HIRING_RE.test(raw);
  const talent = TALENT_RE.test(raw);
  if (hiring) return "hiring";
  if (talent) return "talent";
  return null;
}
