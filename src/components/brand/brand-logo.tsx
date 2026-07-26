import { BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoSize = "header" | "footer" | "sidebar" | "auth";

/**
 * onDark — always white (header / footer / dashboard chrome sit on purple).
 * auto — full color in light theme, white silhouette in dark theme.
 * color — always full-color (e.g. light auth panel).
 */
type BrandLogoTone = "onDark" | "auto" | "color";

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  header: "h-11 w-auto max-w-[240px] sm:h-12",
  footer: "h-10 w-auto max-w-[220px] sm:h-11",
  sidebar: "h-11 w-auto max-w-[200px]",
  auth: "h-11 w-auto max-w-[220px]",
};

const TONE_CLASS: Record<BrandLogoTone, string> = {
  // Pure white mark on purple / dark chrome
  onDark: "brightness-0 invert",
  // Theme-aware: color on light pages, white when html.dark
  auto: "dark:brightness-0 dark:invert",
  color: "",
};

export interface BrandLogoProps {
  size?: BrandLogoSize;
  /** Visual treatment for the background behind the logo. */
  tone?: BrandLogoTone;
  className?: string;
  priority?: boolean;
  /** Accessible label; defaults to NextGen Move. */
  alt?: string;
}

/**
 * Hardcoded NextGen Move logo for chrome surfaces
 * (header, footer, admin/student/employer sidebars, auth).
 * Logo mark only — never paired with a separate site-name label.
 */
export function BrandLogo({
  size = "header",
  tone = "onDark",
  className,
  priority = false,
  alt = "NextGen Move",
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- hardcoded local brand asset
    <img
      src={BRAND_LOGO_PATH}
      alt={alt}
      width={240}
      height={48}
      className={cn(
        "shrink-0 object-contain object-left",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
