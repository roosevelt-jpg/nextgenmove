import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DashboardCardTone = "admin" | "student" | "employer";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  /** Workspace-colored wash + glow for portal dashboards */
  tone?: DashboardCardTone;
}

export function StatCard({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
  tone,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-radius border border-border bg-grad-card px-3.5 py-3",
        tone && "dashboard-stat-card",
        tone && `dashboard-stat-card--${tone}`,
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
