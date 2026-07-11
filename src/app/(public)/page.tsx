import Link from "next/link";
import { AnimatedGlobeHero } from "@/components/public/animated-globe-hero";
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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [page, videoCards, podcastEpisodes] = await Promise.all([
    getPageHome(),
    getLiveVideoCards(),
    getLivePodcastEpisodes(),
  ]);

  const metrics = await getPublicHomeMetrics(page?.originCities?.length ?? 0);
  const statBlocks = resolveHomeStatBlocks(page?.statBlocks, metrics);
  const testimonialBadge = applyCurrentYearToken(page?.testimonialBadge);

  const talentHref = page?.talentCta?.ctaHref?.trim() || "/sign-up";
  const companyHref = page?.companyCta?.ctaHref?.trim() || "/pricing";

  return (
    <div>
      <AnimatedGlobeHero content={page} />

      <section className="page-container pb-2 pt-6">
        <StatBlocksSection statBlocks={statBlocks} valueTone />
      </section>

      <HomeGlobalReachSection page={page} />

      {(page?.itineraryEyebrow ||
        page?.itineraryHeadline ||
        page?.steps?.length) && (
        <section className="page-section space-y-5">
          <div className="space-y-2">
            {page?.itineraryEyebrow ? (
              <SectionEyebrow>{page.itineraryEyebrow}</SectionEyebrow>
            ) : null}
            {page?.itineraryHeadline ? (
              <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
                {page.itineraryHeadline}
              </h2>
            ) : null}
          </div>
          <StepsSection steps={page?.steps} />
        </section>
      )}

      <HomeStoriesSection page={page} cards={videoCards} />
      <HomePodcastSection page={page} episodes={podcastEpisodes} />

      {(page?.testimonialQuote || page?.testimonialAttribution) && (
        <section className="bg-surface-2">
          <div className="page-container py-8 sm:py-10">
            <blockquote className="relative">
              {testimonialBadge ? (
                <span className="mb-3 inline-block rounded-full bg-surface-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-label sm:absolute sm:right-0 sm:top-0 sm:mb-0">
                  {testimonialBadge}
                </span>
              ) : null}
              {page?.testimonialQuote ? (
                <p className="max-w-3xl font-serif text-lg leading-snug text-text-primary sm:text-xl md:text-2xl">
                  “{page.testimonialQuote}”
                </p>
              ) : null}
              {page?.testimonialAttribution ? (
                <footer className="mt-4 text-sm text-text-secondary">
                  {page.testimonialAttribution}
                </footer>
              ) : null}
            </blockquote>
          </div>
        </section>
      )}

      {(page?.talentCta || page?.companyCta) && (
        <section className="page-section grid gap-3 md:grid-cols-2">
          {page?.talentCta?.title || page?.talentCta?.ctaLabel ? (
            <div className="rounded-radius border border-border bg-grad-card p-6 sm:p-7">
              {page.talentCta?.eyebrow ? (
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-label">
                  {page.talentCta.eyebrow}
                </p>
              ) : null}
              {page.talentCta?.title ? (
                <h3 className="font-serif text-xl text-text-primary sm:text-2xl">
                  {page.talentCta.title}
                </h3>
              ) : null}
              {page.talentCta?.body ? (
                <p className="mt-2 text-sm text-text-secondary">
                  {page.talentCta.body}
                </p>
              ) : null}
              {page.talentCta?.ctaLabel ? (
                <Link href={talentHref} className="btn-brand mt-5">
                  {page.talentCta.ctaLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {page?.companyCta?.title || page?.companyCta?.ctaLabel ? (
            <div className="rounded-radius bg-[image:var(--grad-rouse)] p-6 text-on-gradient sm:p-7">
              {page.companyCta?.eyebrow ? (
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-brand-lavender">
                  {page.companyCta.eyebrow}
                </p>
              ) : null}
              {page.companyCta?.title ? (
                <h3 className="font-serif text-xl sm:text-2xl">
                  {page.companyCta.title}
                </h3>
              ) : null}
              {page.companyCta?.body ? (
                <p className="mt-2 text-sm opacity-80">{page.companyCta.body}</p>
              ) : null}
              {page.companyCta?.ctaLabel ? (
                <Link
                  href={companyHref}
                  className="mt-5 inline-flex min-h-11 items-center rounded-radius-sm border border-on-gradient/50 bg-white/15 px-3.5 text-sm font-medium text-on-gradient hover:bg-white/25"
                >
                  {page.companyCta.ctaLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
