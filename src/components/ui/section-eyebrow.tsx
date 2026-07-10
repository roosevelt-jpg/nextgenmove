import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SectionEyebrowProps extends HTMLAttributes<HTMLParagraphElement> {}

/** Purple all-caps section label used across public marketing pages. */
export function SectionEyebrow({ className, ...props }: SectionEyebrowProps) {
  return (
    <p
      className={cn(
        "font-sans text-xs font-medium uppercase tracking-[0.18em] text-text-label",
        className,
      )}
      {...props}
    />
  );
}
