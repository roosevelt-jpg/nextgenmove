"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "outline" | "secondary" | "brand";
export type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Brand Guidelines: Signature CTA = Rouse gradient + white text (all action variants). */
const gradientAction =
  "bg-grad-rouse text-on-gradient shadow-sm hover:opacity-90 disabled:opacity-50 border-0";

const variantClasses: Record<ButtonVariant, string> = {
  primary: gradientAction,
  brand: gradientAction,
  secondary: gradientAction,
  outline: gradientAction,
  ghost: gradientAction,
};

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
