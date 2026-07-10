"use client";

import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id ?? (typeof label === "string" ? label : undefined);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={textareaId}
            className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "min-h-24 w-full resize-y rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none focus:ring-2 focus:ring-border-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-text-warning focus:border-text-warning focus:ring-text-warning/20",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-text-warning" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
