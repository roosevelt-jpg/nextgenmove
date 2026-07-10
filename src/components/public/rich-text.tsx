import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  html?: string;
}

export function RichText({ html, className, ...props }: RichTextProps) {
  if (!html) {
    return null;
  }

  return (
    <div
      className={cn("prose prose-neutral max-w-none text-text-secondary", className)}
      dangerouslySetInnerHTML={{ __html: html }}
      {...props}
    />
  );
}
