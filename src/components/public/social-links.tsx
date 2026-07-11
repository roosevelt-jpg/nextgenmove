import type { SocialLink } from "@/types/cms";
import {
  activeSocialLinks,
  normalizeSocialKey,
  socialLinkLabel,
  type SocialPlatformKey,
} from "@/lib/public/social";
import { cn } from "@/lib/utils";

function IconSvg({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const PLATFORM_ICONS: Record<SocialPlatformKey, React.ReactNode> = {
  linkedin: (
    <IconSvg>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.25h4.52V24H.24V8.25zM8.34 8.25h4.33v2.14h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.93V24h-4.52v-7.75c0-1.85-.03-4.22-2.57-4.22-2.57 0-2.96 2.01-2.96 4.09V24H8.34V8.25z" />
    </IconSvg>
  ),
  instagram: (
    <IconSvg>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0 1.8c-3.15 0-3.52.01-4.76.07-2.25.1-3.3 1.15-3.4 3.4-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.1 2.24 1.16 3.3 3.4 3.4 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c2.25-.1 3.3-1.16 3.4-3.4.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.1-2.25-1.16-3.3-3.4-3.4-1.24-.06-1.61-.07-4.76-.07zm0 3.06a5.18 5.18 0 1 1 0 10.36 5.18 5.18 0 0 1 0-10.36zm0 1.8a3.38 3.38 0 1 0 0 6.76 3.38 3.38 0 0 0 0-6.76zm6.41-2.85a1.21 1.21 0 1 1-2.42 0 1.21 1.21 0 0 1 2.42 0z" />
    </IconSvg>
  ),
  x: (
    <IconSvg>
      <path d="M18.9 2H22l-6.78 7.75L23.25 22h-6.55l-5.13-6.7L5.7 22H2.58l7.25-8.29L.75 2h6.72l4.63 6.13L18.9 2zm-1.15 18.1h1.82L6.38 3.8H4.43l13.32 16.3z" />
    </IconSvg>
  ),
  facebook: (
    <IconSvg>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.41-3.68 3.57-3.68 1.03 0 2.12.18 2.12.18v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.91h-2.22V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </IconSvg>
  ),
  youtube: (
    <IconSvg>
      <path d="M23.5 6.2a3 3 0 0 0-2.12-2.12C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.58A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.12C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.58a3 3 0 0 0 2.12-2.12A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.57V8.43L15.82 12l-6.07 3.57z" />
    </IconSvg>
  ),
  tiktok: (
    <IconSvg>
      <path d="M19.6 7.3a6.5 6.5 0 0 1-3.8-1.2v7.4a5.9 5.9 0 1 1-5.1-5.85v3.05a2.9 2.9 0 1 0 2.1 2.8V2h3a6.5 6.5 0 0 0 3.8 5.3z" />
    </IconSvg>
  ),
  whatsapp: (
    <IconSvg>
      <path d="M20.5 3.5A10.5 10.5 0 0 0 3.4 17.9L2 22l4.2-1.4A10.5 10.5 0 1 0 20.5 3.5zM12 20.1a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-2.5.8.8-2.4-.2-.3A8.1 8.1 0 1 1 12 20.1zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.2-.1-.9-.3-1.8-1.1-.7-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.4 0-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4 2.3.9 2.3.6 2.7.6.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3z" />
    </IconSvg>
  ),
  github: (
    <IconSvg>
      <path d="M12 .5A11.5 11.5 0 0 0 8.2 22.9c.57.1.78-.25.78-.55v-1.9c-3.17.69-3.84-1.53-3.84-1.53-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.64 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.07 0 4.38-2.67 5.34-5.21 5.63.41.35.77 1.05.77 2.12v3.14c0 .3.2.66.79.55A11.5 11.5 0 0 0 12 .5z" />
    </IconSvg>
  ),
  other: (
    <IconSvg>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.5 9h-3.1a15.4 15.4 0 0 0-1.3-5.1A8.03 8.03 0 0 1 19.5 11zM12 4c.9 0 2.3 1.8 3 5H9c.7-3.2 2.1-5 3-5zM4.5 13h3.1c.2 1.8.7 3.6 1.3 5.1A8.03 8.03 0 0 1 4.5 13zm3.1-2H4.5a8.03 8.03 0 0 1 4.4-5.1A15.4 15.4 0 0 0 7.6 11zM12 20c-.9 0-2.3-1.8-3-5h6c-.7 3.2-2.1 5-3 5zm1.9-2a15.4 15.4 0 0 0 1.3-5h3.1a8.03 8.03 0 0 1-4.4 5zM14.9 11c-.2-1.8-.7-3.6-1.3-5.1A8.03 8.03 0 0 1 19.5 11h-4.6zM9.1 11H7.6A15.4 15.4 0 0 0 8.9 16.1 8.03 8.03 0 0 1 4.5 11h4.6z" />
    </IconSvg>
  ),
};

export function SocialLinks({
  links,
  platformLabels = {},
  className,
  iconClassName,
}: {
  links?: SocialLink[];
  platformLabels?: Record<string, string | undefined>;
  className?: string;
  iconClassName?: string;
}) {
  const items = activeSocialLinks(links);
  if (!items.length) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((link) => {
        const platform = normalizeSocialKey(link.key);
        const label = socialLinkLabel(link, platformLabels);
        return (
          <li key={`${link.key}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              title={label}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-radius-sm border border-border text-text-secondary transition-colors hover:border-border-accent hover:text-text-primary",
                iconClassName,
              )}
            >
              {PLATFORM_ICONS[platform]}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
