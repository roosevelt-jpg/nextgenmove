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
        <section className="mx-auto max-w-7xl space-y-8 px-4 py-16">
          <div className="space-y-3">
            {page?.itineraryEyebrow ? (
              <SectionEyebrow>{page.itineraryEyebrow}</SectionEyebrow>
            ) : null}
            {page?.itineraryHeadline ? (
              <h2 className="font-serif text-3xl text-text-primary md:text-4xl">
                {page.itineraryHeadline}
              </h2>
            ) : null}
          </div>
          <StepsSection steps={page?.steps} />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <StatBlocksSection
          statBlocks={page?.statBlocks}
          valueTone
        />
      </section>

      {(page?.testimonialQuote || page?.testimonialAttribution) && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <blockquote className="relative rounded-radius-lg bg-surface-2 px-8 py-10 md:px-12">
            {page?.testimonialBadge ? (
              <span className="absolute right-6 top-6 rounded-full bg-surface-1 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-text-label">
                {page.testimonialBadge}
              </span>
            ) : null}
            {page?.testimonialQuote ? (
              <p className="max-w-3xl font-serif text-2xl leading-snug text-text-primary md:text-3xl">
                “{page.testimonialQuote}”
              </p>
            ) : null}
            {page?.testimonialAttribution ? (
              <footer className="mt-6 text-sm text-text-secondary">
                {page.testimonialAttribution}
              </footer>
            ) : null}
          </blockquote>
        </section>
      )}

      {(page?.talentCta || page?.companyCta) && (
        <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 md:grid-cols-2">
          {page?.talentCta?.title || page?.talentCta?.ctaLabel ? (
            <div className="rounded-radius-lg bg-brand-lavender p-8">
              {page.talentCta?.eyebrow ? (
                <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
                  {page.talentCta.eyebrow}
                </p>
              ) : null}
              {page.talentCta?.title ? (
                <h3 className="font-serif text-2xl text-text-primary">
                  {page.talentCta.title}
                </h3>
              ) : null}
              {page.talentCta?.body ? (
                <p className="mt-3 text-sm text-text-secondary">
                  {page.talentCta.body}
                </p>
              ) : null}
              {page.talentCta?.ctaLabel && page.talentCta?.ctaHref ? (
                <Link
                  href={page.talentCta.ctaHref}
                  className="mt-6 inline-flex rounded-radius bg-fill-primary px-4 py-2 text-sm font-medium text-on-primary"
                >
                  {page.talentCta.ctaLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {page?.companyCta?.title || page?.companyCta?.ctaLabel ? (
            <div className="rounded-radius-lg bg-fill-primary p-8 text-on-primary">
              {page.companyCta?.eyebrow ? (
                <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-brand-lavender">
                  {page.companyCta.eyebrow}
                </p>
              ) : null}
              {page.companyCta?.title ? (
                <h3 className="font-serif text-2xl">{page.companyCta.title}</h3>
              ) : null}
              {page.companyCta?.body ? (
                <p className="mt-3 text-sm opacity-80">{page.companyCta.body}</p>
              ) : null}
              {page.companyCta?.ctaLabel && page.companyCta?.ctaHref ? (
                <Link
                  href={page.companyCta.ctaHref}
                  className="mt-6 inline-flex rounded-radius border border-on-primary/40 px-4 py-2 text-sm font-medium text-on-primary"
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
