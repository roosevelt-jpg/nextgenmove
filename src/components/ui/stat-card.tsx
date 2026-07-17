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
        "rounded-radius border border-border bg-grad-card px-3.5 py-3",
        className,
      )}
    >
      <div
        className={cn(
          "font-mono text-[10px] uppercase tracking-wide text-text-muted",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-serif text-xl font-semibold text-text-accent",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}
