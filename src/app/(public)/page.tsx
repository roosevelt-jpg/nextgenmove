import { AnimatedGlobeHero } from "@/components/public/animated-globe-hero";
import { HomeAudienceCtaSection } from "@/components/public/home-audience-cta-section";
import { HomeGlobalReachSection } from "@/components/public/home-global-reach-section";
import { HomePodcastSection } from "@/components/public/home-podcast-section";
import { HomeStoriesSection } from "@/components/public/home-stories-section";
import { HomeTestimonialsSection } from "@/components/public/home-testimonials-section";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { StepsSection } from "@/components/public/steps-section";
import { SectionEyebrow } from "@/components/ui";
import {
  getLivePodcastEpisodes,
  getLiveVideoCards,
  getPageHome,
} from "@/lib/collections/pages";
import { getPublishedTestimonials } from "@/lib/collections/testimonials";
import { resolveHomeStoryCards } from "@/lib/public/demo-story-videos";
import {
  getPublicHomeMetrics,
  resolveHomeStatBlocks,
} from "@/lib/public/home-stats";

export const revalidate = 30;

export default async function HomePage() {
  const [page, videoCards, podcastEpisodes, testimonials] = await Promise.all([
    getPageHome(),
    getLiveVideoCards(),
    getLivePodcastEpisodes(),
    getPublishedTestimonials(),
  ]);

  const storyCards = resolveHomeStoryCards(videoCards);

  const metrics = await getPublicHomeMetrics(page.originCities?.length ?? 0);
  const statBlocks = resolveHomeStatBlocks(page.statBlocks, metrics);

  return (
    <div className="overflow-x-hidden">
      <AnimatedGlobeHero content={page} />

      <section className="page-container pb-2 pt-6">
        <StatBlocksSection statBlocks={statBlocks} valueTone />
      </section>

      <HomeGlobalReachSection page={page} />

      {(page.itineraryEyebrow ||
        page.itineraryHeadline ||
        page.steps?.length) && (
        <section className="page-section space-y-5">
          <div className="space-y-2">
            {page.itineraryEyebrow ? (
              <SectionEyebrow>{page.itineraryEyebrow}</SectionEyebrow>
            ) : null}
            {page.itineraryHeadline ? (
              <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
                {page.itineraryHeadline}
              </h2>
            ) : null}
          </div>
          <StepsSection steps={page.steps} />
        </section>
      )}

      <HomeStoriesSection page={page} cards={storyCards} />
      <HomePodcastSection page={page} episodes={podcastEpisodes} />

      <HomeTestimonialsSection page={page} items={testimonials} />

      <HomeAudienceCtaSection
        talentCta={page.talentCta}
        companyCta={page.companyCta}
        rolesCta={page.rolesCta}
      />
    </div>
  );
}
