import { BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoSize = "header" | "footer" | "sidebar" | "auth";

/**
 * onDark — white mark on purple / dark chrome.
 * auto — full color in light theme, white silhouette in dark theme.
 * color — always full-color (e.g. light auth panel).
 */
type BrandLogoTone = "onDark" | "auto" | "color";

/** Intrinsic mark size after trim (public/brand/nextgenmove-logo-mark.png). */
const LOGO_INTRINSIC = { width: 1008, height: 558 } as const;

const SIZE_STYLE: Record<
  BrandLogoSize,
  { height: number; maxWidth: number }
> = {
  header: { height: 40, maxWidth: 168 },
  footer: { height: 36, maxWidth: 152 },
  sidebar: { height: 36, maxWidth: 148 },
  auth: { height: 40, maxWidth: 168 },
};

const TONE_CLASS: Record<BrandLogoTone, string> = {
  // White mark on purple / dark chrome (asset has transparent background)
  onDark: "brightness-0 invert",
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
  const { height, maxWidth } = SIZE_STYLE[size];
  const width = Math.round(
    (height * LOGO_INTRINSIC.width) / LOGO_INTRINSIC.height,
  );

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center overflow-hidden",
        className,
      )}
      style={{ height, maxWidth, maxHeight: height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- hardcoded local brand asset */}
      <img
        src={BRAND_LOGO_PATH}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "block h-full w-auto max-h-full max-w-full object-contain object-left",
          TONE_CLASS[tone],
        )}
        style={{ height, maxWidth, width: "auto" }}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </span>
  );
}
