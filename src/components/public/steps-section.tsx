import type { StepItem } from "@/types/cms";
import { cn } from "@/lib/utils";

export interface StepsSectionProps {
  steps?: StepItem[];
  className?: string;
}

function gridClassForCount(count: number): string {
  if (count >= 4) {
    return "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4";
  }
  if (count === 3) {
    return "grid grid-cols-1 gap-3 md:grid-cols-3";
  }
  if (count === 2) {
    return "grid grid-cols-1 gap-3 sm:grid-cols-2";
  }
  return "grid grid-cols-1 gap-3";
}

export function StepsSection({ steps, className }: StepsSectionProps) {
  if (!steps?.length) {
    return null;
  }

  const compact = steps.length >= 4;

  return (
    <section className={className}>
      <ol className={gridClassForCount(steps.length)}>
        {steps.map((step, index) => (
          <li
            key={`${step.legNumber}-${step.title}`}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-radius border border-border bg-grad-card",
              compact ? "p-3.5 sm:p-4" : "p-5 sm:p-6",
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute font-serif leading-none text-brand-indigo-2/10",
                compact
                  ? "-right-2 -top-3 text-[4.5rem]"
                  : "-right-4 -top-6 text-[7rem]",
              )}
            >
              {String(step.legNumber || index + 1).padStart(2, "0")}
            </div>
            <div className={cn("relative", compact ? "space-y-2" : "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-radius-sm bg-[image:var(--grad-rouse)] font-mono font-semibold text-on-gradient",
                    compact
                      ? "h-7 w-7 text-[10px]"
                      : "h-9 w-9 text-[11px]",
                  )}
                >
                  {String(step.legNumber || index + 1).padStart(2, "0")}
                </span>
                {step.phaseLabel ? (
                  <div className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-label">
                    {step.phaseLabel}
                  </div>
                ) : null}
              </div>
              <h3
                className={cn(
                  "font-serif text-text-primary",
                  compact
                    ? "text-base leading-snug sm:text-lg"
                    : "text-xl sm:text-2xl",
                )}
              >
                {step.title}
              </h3>
              <p
                className={cn(
                  "text-text-secondary",
                  compact
                    ? "text-[13px] leading-snug"
                    : "text-sm leading-relaxed",
                )}
              >
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
