import Link from "next/link";
import { AnimatedGlobeHero } from "@/components/public/animated-globe-hero";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { StepsSection } from "@/components/public/steps-section";
import { SectionEyebrow } from "@/components/ui";
import { getPageHome } from "@/lib/collections/pages";

export default async function HomePage() {
  const page = await getPageHome();

  return (
    <div>
      <AnimatedGlobeHero content={page} />

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

      <section className="page-pad pb-8">
        <StatBlocksSection
          statBlocks={page?.statBlocks}
          valueTone
        />
      </section>

      {(page?.testimonialQuote || page?.testimonialAttribution) && (
        <section className="page-pad pb-8">
          <blockquote className="relative rounded-radius bg-surface-2 px-5 py-6 sm:px-7 sm:py-7">
            {page?.testimonialBadge ? (
              <span className="mb-3 inline-block rounded-full bg-surface-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-label sm:absolute sm:right-5 sm:top-5 sm:mb-0">
                {page.testimonialBadge}
              </span>
            ) : null}
            {page?.testimonialQuote ? (
              <p className="max-w-2xl font-serif text-lg leading-snug text-text-primary sm:text-xl md:text-2xl">
                “{page.testimonialQuote}”
              </p>
            ) : null}
            {page?.testimonialAttribution ? (
              <footer className="mt-4 text-sm text-text-secondary">
                {page.testimonialAttribution}
              </footer>
            ) : null}
          </blockquote>
        </section>
      )}

      {(page?.talentCta || page?.companyCta) && (
        <section className="page-pad grid gap-3 pb-10 md:grid-cols-2">
          {page?.talentCta?.title || page?.talentCta?.ctaLabel ? (
            <div className="rounded-radius bg-brand-lavender p-5">
              {page.talentCta?.eyebrow ? (
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-label">
                  {page.talentCta.eyebrow}
                </p>
              ) : null}
              {page.talentCta?.title ? (
                <h3 className="font-serif text-lg text-text-primary sm:text-xl">
                  {page.talentCta.title}
                </h3>
              ) : null}
              {page.talentCta?.body ? (
                <p className="mt-2 text-sm text-text-secondary">
                  {page.talentCta.body}
                </p>
              ) : null}
              {page.talentCta?.ctaLabel && page.talentCta?.ctaHref ? (
                <Link
                  href={page.talentCta.ctaHref}
                  className="mt-4 inline-flex rounded-radius-sm bg-fill-primary px-3.5 py-1.5 text-sm font-medium text-on-primary"
                >
                  {page.talentCta.ctaLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {page?.companyCta?.title || page?.companyCta?.ctaLabel ? (
            <div className="rounded-radius bg-fill-primary p-5 text-on-primary">
              {page.companyCta?.eyebrow ? (
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-brand-lavender">
                  {page.companyCta.eyebrow}
                </p>
              ) : null}
              {page.companyCta?.title ? (
                <h3 className="font-serif text-lg sm:text-xl">
                  {page.companyCta.title}
                </h3>
              ) : null}
              {page.companyCta?.body ? (
                <p className="mt-2 text-sm opacity-80">{page.companyCta.body}</p>
              ) : null}
              {page.companyCta?.ctaLabel && page.companyCta?.ctaHref ? (
                <Link
                  href={page.companyCta.ctaHref}
                  className="mt-4 inline-flex rounded-radius-sm border border-on-primary/40 px-3.5 py-1.5 text-sm font-medium text-on-primary"
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
