"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "outline" | "secondary" | "brand";
export type ButtonSize = "default" | "sm" | "xs" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Signature CTA: blue→purple gradient + white text via `.btn-brand`
 * (explicit background-image — more reliable than Tailwind bg-* alone).
 */
const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-7 shrink-0 whitespace-nowrap px-2.5 py-1 text-xs",
  sm: "min-h-6 shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]",
  xs: "min-h-6 shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px] leading-tight",
  lg: "min-h-8 shrink-0 whitespace-nowrap px-3 py-1.5 text-xs",
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
    void variant;
    return (
      <button
        ref={ref}
        type={type}
        className={cn("btn-brand", sizeClasses[size], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
