"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "outline" | "secondary" | "brand";
export type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Signature CTA: blue→purple gradient + white text via `.btn-brand`
 * (explicit background-image — more reliable than Tailwind bg-* alone).
 */
const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-11 px-3.5 py-2.5 text-sm",
  sm: "min-h-9 px-2.5 py-1.5 text-xs",
  lg: "min-h-12 px-5 py-3 text-sm",
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
