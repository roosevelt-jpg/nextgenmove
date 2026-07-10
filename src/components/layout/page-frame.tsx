import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageFrameProps {
  children: ReactNode;
  className?: string;
  /** Tighter vertical margin for portal shells */
  compact?: boolean;
}

/**
 * Centered app shell — keeps the platform from stretching edge-to-edge
 * and gives every surface a contained “wrapper” feel.
 */
export function PageFrame({ children, className, compact }: PageFrameProps) {
  return (
    <div
      className={cn(
        "page-frame",
        compact && "page-frame--compact",
        className,
      )}
    >
      {children}
    </div>
  );
}
