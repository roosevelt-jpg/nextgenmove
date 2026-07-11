import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SectionEyebrowProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * Brand Guidelines: JetBrains Mono, uppercase, purple (#3C3489), ~11px.
 */
export function SectionEyebrow({ className, ...props }: SectionEyebrowProps) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-label",
        className,
      )}
      {...props}
    />
  );
}
