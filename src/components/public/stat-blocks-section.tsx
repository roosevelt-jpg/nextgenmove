import type { StatBlock } from "@/types/cms";
import { cn } from "@/lib/utils";

export interface StatBlocksSectionProps {
  statBlocks?: StatBlock[];
  className?: string;
  valueTone?: boolean;
}

const VALUE_TONES = [
  "text-fill-accent",
  "text-text-accent",
  "text-text-success",
  "text-text-primary",
] as const;

export function StatBlocksSection({
  statBlocks,
  className,
  valueTone = false,
}: StatBlocksSectionProps) {
  if (!statBlocks?.length) {
    return null;
  }

  return (
    <section className={className}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statBlocks.map((block, index) => (
          <div
            key={`${block.label}-${block.value}`}
            className="rounded-radius border border-border bg-surface-1 px-5 py-5"
          >
            <div
              className={cn(
                "font-serif text-3xl font-semibold",
                valueTone
                  ? VALUE_TONES[index % VALUE_TONES.length]
                  : "text-text-primary",
              )}
            >
              {block.value}
            </div>
            <div className="mt-2 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              {block.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
