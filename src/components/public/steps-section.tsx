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
      <ol className="grid gap-5 md:grid-cols-3">
        {steps.map((step) => (
          <li
            key={`${step.legNumber}-${step.title}`}
            className="rounded-radius border border-border bg-surface-1 p-6"
          >
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
              {step.phaseLabel
                ? `LEG ${String(step.legNumber).padStart(2, "0")} · ${step.phaseLabel}`
                : `LEG ${String(step.legNumber).padStart(2, "0")}`}
            </div>
            <h3 className="mt-3 font-serif text-xl text-text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
