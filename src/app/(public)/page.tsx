import { AnimatedGlobeHero } from "@/components/public/animated-globe-hero";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { StepsSection } from "@/components/public/steps-section";
import { getPageHome } from "@/lib/collections/pages";

export default async function HomePage() {
  const page = await getPageHome();

  return (
    <div className="space-y-16">
      <AnimatedGlobeHero content={page} />
      <StatBlocksSection statBlocks={page?.statBlocks} />
      <StepsSection steps={page?.steps} />
    </div>
  );
}
