import type { StatBlock } from "@/types/cms";
import { StatCard } from "@/components/ui";

export interface StatBlocksSectionProps {
  statBlocks?: StatBlock[];
  className?: string;
}

export function StatBlocksSection({ statBlocks, className }: StatBlocksSectionProps) {
  if (!statBlocks?.length) {
    return null;
  }

  return (
    <section className={className}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statBlocks.map((block) => (
          <StatCard key={`${block.label}-${block.value}`} label={block.label} value={block.value} />
        ))}
      </div>
    </section>
  );
}
