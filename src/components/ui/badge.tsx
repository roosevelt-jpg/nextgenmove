import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "accent" | "success" | "warning";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** Brand Guidelines: pills use 10%-tint bg + full-strength text — never solid fill. */
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-bg-purple text-fill-accent",
  accent: "bg-bg-accent text-text-accent",
  success: "bg-bg-success text-text-success",
  warning: "bg-bg-warning text-text-warning",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
