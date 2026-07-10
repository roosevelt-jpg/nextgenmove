import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-radius border border-dashed border-border bg-surface-1 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-text-muted" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="text-base font-medium text-text-primary">{title}</div>
      {description ? (
        <div className="mt-2 max-w-sm text-sm text-text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
