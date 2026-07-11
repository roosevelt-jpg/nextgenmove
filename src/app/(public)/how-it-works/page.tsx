import { SectionEyebrow } from "@/components/ui";
import { StepsSection } from "@/components/public/steps-section";
import { getPageHowItWorks } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function HowItWorksPage() {
  const [page, settings] = await Promise.all([getPageHowItWorks(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="page-section space-y-10">
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
                      className="text-text-muted transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm text-text-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
