import { Accordion } from "@/components/ui";
import { StepsSection } from "@/components/public/steps-section";
import { getPageHowItWorks } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function HowItWorksPage() {
  const [page, settings] = await Promise.all([getPageHowItWorks(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="space-y-16">
      {pageLabels.howItWorksTitle ? (
        <h1 className="font-serif text-4xl text-text-primary">{pageLabels.howItWorksTitle}</h1>
      ) : null}
      <StepsSection steps={page?.steps} />
      {page?.faqItems?.length ? (
        <section className="space-y-4">
          {pageLabels.faqTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{pageLabels.faqTitle}</h2>
          ) : null}
          <Accordion
            items={page.faqItems.map((item, index) => ({
              id: `faq-${index}`,
              title: item.question,
              content: item.answer,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
