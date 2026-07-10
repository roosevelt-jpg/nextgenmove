"use client";

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: ReactNode;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  placeholder?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? (typeof label === "string" ? label : undefined);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={selectId}
            className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted"
          >
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary focus:border-border-accent focus:outline-none focus:ring-2 focus:ring-border-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-text-warning focus:border-text-warning focus:ring-text-warning/20",
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-xs text-text-warning" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";
