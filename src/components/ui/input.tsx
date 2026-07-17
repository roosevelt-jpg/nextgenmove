"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  /** Show eye toggle when type is password. */
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      className,
      id,
      type = "text",
      showPasswordToggle,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? (typeof label === "string" ? label : undefined);
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === "password";
    const toggle = Boolean(showPasswordToggle ?? isPassword);
    const resolvedType =
      isPassword && toggle ? (revealed ? "text" : "password") : type;

    return (
      <div className="flex w-full flex-col gap-1">
        {label != null && String(label).trim() !== "" ? (
          <label
            htmlFor={inputId}
            className="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className={cn(
              "min-h-11 w-full rounded-radius-sm border border-border bg-surface-1 px-2.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none focus:ring-2 focus:ring-border-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
              toggle && isPassword && "pr-10",
              error &&
                "border-text-warning focus:border-text-warning focus:ring-text-warning/20",
              className,
            )}
            {...props}
          />
          {toggle && isPassword ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary"
              aria-label={revealed ? "Hide password" : "Show password"}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-text-warning" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
