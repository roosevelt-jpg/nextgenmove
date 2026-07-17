"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Brand Guidelines §05:
 * - primary → Ink fill
 * - brand → Purple fill
 * - signature → Horizon gradient (use once per screen)
 * - outline / secondary → bordered secondary
 * - ghost → text-only purple
 */
export type ButtonVariant =
  | "primary"
  | "brand"
  | "signature"
  | "ghost"
  | "outline"
  | "secondary";
export type ButtonSize = "default" | "sm" | "xs" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-6 shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]",
  sm: "min-h-5 shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px]",
  xs: "min-h-5 shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px] leading-tight",
  lg: "min-h-7 shrink-0 whitespace-nowrap px-2.5 py-1 text-xs",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-base btn-ink",
  brand: "btn-base btn-purple",
  signature: "btn-base btn-signature",
  secondary: "btn-base btn-outline",
  outline: "btn-base btn-outline",
  ghost: "btn-base btn-ghost",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      className,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(variantClasses[variant], sizeClasses[size], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
