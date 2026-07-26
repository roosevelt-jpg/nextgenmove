import { BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoSize = "header" | "footer" | "sidebar" | "auth";

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  header: "h-9 w-auto max-w-[200px] sm:h-10",
  footer: "h-8 w-auto max-w-[180px] sm:h-9",
  sidebar: "h-9 w-auto max-w-[180px]",
  auth: "h-9 w-auto max-w-[180px]",
};

export interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
  /** Accessible label; defaults to NextGen Move. */
  alt?: string;
}

/**
 * Hardcoded NextGen Move logo for chrome surfaces
 * (header, footer, admin/student/employer sidebars, auth).
 * Uses a plain img so it never depends on the image optimizer or CMS.
 */
export function BrandLogo({
  size = "header",
  className,
  priority = false,
  alt = "NextGen Move",
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- hardcoded local brand asset
    <img
      src={BRAND_LOGO_PATH}
      alt={alt}
      width={200}
      height={40}
      className={cn(
        "shrink-0 object-contain object-left",
        SIZE_CLASS[size],
        className,
      )}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
