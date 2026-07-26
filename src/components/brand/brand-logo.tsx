import Image from "next/image";
import { BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoSize = "header" | "footer" | "sidebar" | "auth";

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  header: "h-9 w-auto sm:h-10",
  footer: "h-8 w-auto sm:h-9",
  sidebar: "h-8 w-auto max-w-[168px]",
  auth: "h-9 w-auto",
};

const SIZE_PX: Record<BrandLogoSize, { width: number; height: number }> = {
  header: { width: 180, height: 40 },
  footer: { width: 160, height: 36 },
  sidebar: { width: 168, height: 32 },
  auth: { width: 160, height: 36 },
};

export interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
  /** Accessible label; defaults to NextGen Move. */
  alt?: string;
}

/** Hardcoded NextGen Move logo for chrome surfaces. */
export function BrandLogo({
  size = "header",
  className,
  priority = false,
  alt = "NextGen Move",
}: BrandLogoProps) {
  const dims = SIZE_PX[size];

  return (
    <Image
      src={BRAND_LOGO_PATH}
      alt={alt}
      width={dims.width}
      height={dims.height}
      className={cn(
        "shrink-0 object-contain object-left",
        SIZE_CLASS[size],
        className,
      )}
      priority={priority}
    />
  );
}
