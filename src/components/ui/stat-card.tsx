import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-radius border border-border bg-surface-1 px-5 py-4",
        className,
      )}
    >
      <div
        className={cn(
          "font-mono text-xs uppercase tracking-wide text-text-muted",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-serif text-2xl font-semibold text-text-primary",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}
