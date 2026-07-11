import type { SocialLink } from "@/types/cms";

/** Canonical platform keys used for icons and admin selects. */
export const SOCIAL_PLATFORM_KEYS = [
  "linkedin",
  "instagram",
  "x",
  "facebook",
  "youtube",
  "tiktok",
  "whatsapp",
  "github",
  "other",
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORM_KEYS)[number];

export function normalizeSocialKey(raw: string): SocialPlatformKey {
  const key = raw.trim().toLowerCase();
  if (key === "twitter" || key === "x.com") return "x";
  if ((SOCIAL_PLATFORM_KEYS as readonly string[]).includes(key)) {
    return key as SocialPlatformKey;
  }
  return "other";
}

export function socialLinkLabel(
  link: SocialLink,
  platformLabels: Record<string, string | undefined> = {},
): string {
  if (link.label?.trim()) return link.label.trim();
  const platform = normalizeSocialKey(link.key);
  const camelKey = `platform${platform.charAt(0).toUpperCase()}${platform.slice(1)}`;
  const fromCms = platformLabels[camelKey];
  if (fromCms?.trim()) return fromCms.trim();
  const defaults: Record<SocialPlatformKey, string> = {
    linkedin: "LinkedIn",
    instagram: "Instagram",
    x: "X",
    facebook: "Facebook",
    youtube: "YouTube",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    github: "GitHub",
    other: "Link",
  };
  return defaults[platform];
}

export function activeSocialLinks(links: SocialLink[] | undefined): SocialLink[] {
  if (!links?.length) return [];
  return links.filter((link) => Boolean(link.url?.trim()));
}
