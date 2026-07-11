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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statBlocks.map((block, index) => (
          <div
            key={`${block.label}-${block.value}`}
            className="min-w-0 rounded-radius border border-border bg-grad-card px-3 py-4 sm:px-5 sm:py-5"
          >
            <div
              className={cn(
                "font-serif text-2xl font-semibold sm:text-3xl",
                valueTone
                  ? VALUE_TONES[index % VALUE_TONES.length]
                  : "text-text-primary",
              )}
            >
              {block.value}
            </div>
            <div className="mt-2 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted sm:text-[11px]">
              {block.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
