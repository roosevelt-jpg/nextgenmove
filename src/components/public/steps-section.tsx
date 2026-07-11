import type { StepItem } from "@/types/cms";

export interface StepsSectionProps {
  steps?: StepItem[];
  className?: string;
}

export function StepsSection({ steps, className }: StepsSectionProps) {
  if (!steps?.length) {
    return null;
  }

  return (
    <section className={className}>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={`${step.legNumber}-${step.title}`}
            className="relative overflow-hidden rounded-radius border border-border bg-grad-card p-5 sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-6 font-serif text-[7rem] leading-none text-brand-indigo-2/10"
            >
              {String(step.legNumber || index + 1).padStart(2, "0")}
            </div>
            <div className="relative space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-sm bg-[image:var(--grad-rouse)] font-mono text-[11px] font-semibold text-on-gradient">
                  {String(step.legNumber || index + 1).padStart(2, "0")}
                </span>
                {step.phaseLabel ? (
                  <div className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-label">
                    {step.phaseLabel}
                  </div>
                ) : null}
              </div>
              <h3 className="font-serif text-xl text-text-primary sm:text-2xl">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
