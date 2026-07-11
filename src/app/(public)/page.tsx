import { AnimatedGlobeHero } from "@/components/public/animated-globe-hero";
import { HomeAudienceCtaSection } from "@/components/public/home-audience-cta-section";
import { HomeGlobalReachSection } from "@/components/public/home-global-reach-section";
import { HomePodcastSection } from "@/components/public/home-podcast-section";
import { HomeStoriesSection } from "@/components/public/home-stories-section";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { StepsSection } from "@/components/public/steps-section";
import { SectionEyebrow } from "@/components/ui";
import {
  getLivePodcastEpisodes,
  getLiveVideoCards,
  getPageHome,
} from "@/lib/collections/pages";
import {
  applyCurrentYearToken,
  getPublicHomeMetrics,
  resolveHomeStatBlocks,
} from "@/lib/public/home-stats";

export const revalidate = 30;

export default async function HomePage() {
  const [page, videoCards, podcastEpisodes] = await Promise.all([
    getPageHome(),
    getLiveVideoCards(),
    getLivePodcastEpisodes(),
  ]);

  const metrics = await getPublicHomeMetrics(page.originCities?.length ?? 0);
  const statBlocks = resolveHomeStatBlocks(page.statBlocks, metrics);
  const testimonialBadge = applyCurrentYearToken(page.testimonialBadge);

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

      <HomeStoriesSection page={page} cards={videoCards} />
      <HomePodcastSection page={page} episodes={podcastEpisodes} />

      {(page.testimonialQuote || page.testimonialAttribution) && (
        <section className="bg-surface-2">
          <div className="page-container py-8 sm:py-10">
            <blockquote className="relative pr-0 sm:pr-28">
              {testimonialBadge ? (
                <span className="mb-3 inline-block rounded-full bg-surface-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-label sm:absolute sm:right-0 sm:top-0 sm:mb-0">
                  {testimonialBadge}
                </span>
              ) : null}
              {page.testimonialQuote ? (
                <p className="max-w-3xl font-serif text-lg leading-snug text-text-primary sm:text-xl md:text-2xl">
                  “{page.testimonialQuote}”
                </p>
              ) : null}
              {page.testimonialAttribution ? (
                <footer className="mt-4 text-sm text-text-secondary">
                  {page.testimonialAttribution}
                </footer>
              ) : null}
            </blockquote>
          </div>
        </section>
      )}

      <HomeAudienceCtaSection
        talentCta={page.talentCta}
        companyCta={page.companyCta}
        rolesCta={page.rolesCta}
      />
    </div>
  );
}
