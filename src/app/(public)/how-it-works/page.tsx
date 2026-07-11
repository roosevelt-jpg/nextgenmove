import Link from "next/link";
import { Button, SectionEyebrow } from "@/components/ui";
import { StepsSection } from "@/components/public/steps-section";
import { getPageHowItWorks } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function HowItWorksPage() {
  const [page, settings] = await Promise.all([getPageHowItWorks(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};
  const ctaLabel = pageLabels.howItWorksCtaLabel ?? pageLabels.getStarted;
  const ctaHref = pageLabels.howItWorksCtaHref || "/sign-up";

  return (
    <div className="page-section space-y-12">
      <header className="max-w-2xl space-y-3">
        {pageLabels.howItWorksEyebrow || pageLabels.howItWorksTitle ? (
          <SectionEyebrow>
            {pageLabels.howItWorksEyebrow ?? pageLabels.howItWorksTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.howItWorksHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.howItWorksHeadline}
          </h1>
        ) : pageLabels.howItWorksTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.howItWorksTitle}
          </h1>
        ) : null}
        {pageLabels.howItWorksIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">{pageLabels.howItWorksIntro}</p>
        ) : null}
      </header>

      <StepsSection steps={page?.steps} />

      {ctaLabel ? (
        <div className="flex flex-wrap items-center gap-4 rounded-radius border border-border bg-grad-card px-5 py-6 sm:px-8">
          {pageLabels.howItWorksCtaBody ? (
            <p className="max-w-xl flex-1 text-sm text-text-secondary">
              {pageLabels.howItWorksCtaBody}
            </p>
          ) : null}
          <Link href={ctaHref}>
            <Button size="sm">{ctaLabel}</Button>
          </Link>
        </div>
      ) : null}

      {page?.faqItems?.length ? (
        <section className="space-y-6 border-t border-border pt-12">
          {pageLabels.faqTitle ? (
            <SectionEyebrow>{pageLabels.faqTitle}</SectionEyebrow>
          ) : null}
          <div className="divide-y divide-border">
            {page.faqItems.map((item, index) => (
              <details key={`faq-${index}`} className="group py-5">
                <summary className="cursor-pointer list-none font-serif text-xl text-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-sm border border-border text-text-muted transition group-open:rotate-45 group-open:border-transparent group-open:bg-[image:var(--grad-rouse)] group-open:text-on-gradient"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
