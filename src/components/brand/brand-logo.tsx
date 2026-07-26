import {
  BRAND_LOGO_ON_DARK_PATH,
  BRAND_LOGO_PATH,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoSize = "header" | "footer" | "sidebar" | "auth";

/**
 * onDark — white transparent mark on purple / dark chrome (no CSS invert).
 * auto — full color in light theme, white mark in dark theme.
 * color — always full-color (e.g. light auth panel).
 */
type BrandLogoTone = "onDark" | "auto" | "color";

/** Intrinsic mark size after trim (public/brand/nextgenmove-logo-mark.png). */
const LOGO_INTRINSIC = { width: 1008, height: 558 } as const;

const SIZE_STYLE: Record<
  BrandLogoSize,
  { height: number; maxWidth: number }
> = {
  header: { height: 36, maxWidth: 148 },
  footer: { height: 32, maxWidth: 136 },
  sidebar: { height: 32, maxWidth: 132 },
  auth: { height: 36, maxWidth: 148 },
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

function logoSrcForTone(tone: BrandLogoTone): string {
  if (tone === "onDark") return BRAND_LOGO_ON_DARK_PATH;
  if (tone === "color") return BRAND_LOGO_PATH;
  // auto: prefer color; dark theme swaps via CSS media on a dual-img is heavy —
  // use white mark when html.dark is present by rendering both with dark: classes.
  return BRAND_LOGO_PATH;
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

  const imgClass =
    "block h-full w-auto max-h-full max-w-full object-contain object-left";
  const boxStyle = { height, maxWidth, maxHeight: height } as const;
  const imgStyle = { height, maxWidth, width: "auto" as const };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center overflow-hidden",
        className,
      )}
      style={boxStyle}
    >
      {tone === "auto" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- hardcoded local brand asset */}
          <img
            src={BRAND_LOGO_PATH}
            alt={alt}
            width={width}
            height={height}
            className={cn(imgClass, "dark:hidden")}
            style={imgStyle}
            decoding="async"
            {...(priority ? { fetchPriority: "high" as const } : {})}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- hardcoded local brand asset */}
          <img
            src={BRAND_LOGO_ON_DARK_PATH}
            alt=""
            aria-hidden
            width={width}
            height={height}
            className={cn(imgClass, "hidden dark:block")}
            style={imgStyle}
            decoding="async"
          />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- hardcoded local brand asset
        <img
          src={logoSrcForTone(tone)}
          alt={alt}
          width={width}
          height={height}
          className={imgClass}
          style={imgStyle}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
      )}
    </span>
  );
}
