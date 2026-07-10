"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "outline" | "secondary" | "brand";
export type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Brand Guidelines: primary = Ink; brand = Purple; outline = Ink border. */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-fill-primary text-on-primary hover:opacity-90 disabled:opacity-50",
  brand:
    "bg-fill-accent text-on-accent hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-fill-accent-strong text-on-accent hover:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-text-primary hover:bg-surface-2 disabled:opacity-50",
  outline:
    "border border-fill-primary bg-transparent text-text-primary hover:bg-surface-2 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
  lg: "px-6 py-3 text-base",
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
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-radius-sm font-semibold transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-accent",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
