import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "article" | "main";
}

/**
 * Centers content in the content column. Backgrounds stay full-bleed
 * on the parent; only children are constrained — leaving excess side area.
 */
export function PageContainer({
  children,
  className,
  as: Tag = "div",
}: PageContainerProps) {
  return <Tag className={cn("page-container", className)}>{children}</Tag>;
}
