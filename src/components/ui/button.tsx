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
 * Signature CTAs use full-color brand gradients via `.btn-brand`.
 * Outline / ghost keep gradient washes so every action stays colorful.
 */
const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-6 shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]",
  sm: "min-h-5 shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px]",
  xs: "min-h-5 shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px] leading-tight",
  lg: "min-h-7 shrink-0 whitespace-nowrap px-2.5 py-1 text-xs",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-brand !text-white",
  brand: "btn-brand !text-white",
  secondary: "btn-brand !text-white",
  outline: "btn-brand btn-brand-outline !text-white",
  ghost: "btn-brand btn-brand-ghost !text-white",
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
