import Link from "next/link";
import { Button, Card, CardBody, SectionEyebrow } from "@/components/ui";
import { getPagePricing, getProgramLevers } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { PUBLIC_ROUTES } from "@/lib/public/nav";

export default async function PricingPage() {
  const [page, programLevers, settings] = await Promise.all([
    getPagePricing(),
    getProgramLevers(),
    getSiteSettings(),
  ]);
  const pageLabels = settings.pageLabels ?? {};
  const ctaLabel = page?.ctaLabel ?? pageLabels.pricingCtaLabel;
  const showTrackA =
    Boolean(page?.trackAHeadline) ||
    Boolean(page?.trackAFeatures?.length) ||
    (programLevers &&
      (pageLabels.trackAMonthlyLabel || pageLabels.trackAMatchFeeLabel));
  const showTrackB =
    Boolean(page?.trackBHeadline) ||
    Boolean(page?.trackBFeatures?.length) ||
    (programLevers && pageLabels.trackBMonthlyLabel);

  return (
    <div className="page-section space-y-8">
      <header className="max-w-2xl space-y-3">
        {pageLabels.pricingEyebrow || pageLabels.pricingTitle ? (
          <SectionEyebrow>
            {pageLabels.pricingEyebrow ?? pageLabels.pricingTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.pricingHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.pricingHeadline}
          </h1>
        ) : pageLabels.pricingTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.pricingTitle}
          </h1>
        ) : null}
        {pageLabels.pricingIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">{pageLabels.pricingIntro}</p>
        ) : null}
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {showTrackA ? (
          <Card>
            <CardBody className="space-y-4">
              {pageLabels.trackATitle ? (
                <SectionEyebrow>{pageLabels.trackATitle}</SectionEyebrow>
              ) : null}
              {page?.trackAHeadline ? (
                <h2 className="font-serif text-2xl text-text-primary">
                  {page.trackAHeadline}
                </h2>
              ) : null}
              {programLevers && pageLabels.trackAMonthlyLabel ? (
                <p className="font-serif text-4xl text-text-primary">
                  {pageLabels.trackAMonthlyLabel.replace(
                    "{amount}",
                    String(programLevers.trackAMonthly),
                  )}
                </p>
              ) : null}
              {programLevers && pageLabels.trackAMatchFeeLabel ? (
                <p className="text-sm text-text-secondary">
                  {pageLabels.trackAMatchFeeLabel.replace(
                    "{amount}",
                    String(programLevers.trackAMatchFee),
                  )}
                </p>
              ) : null}
              {page?.trackAFeatures?.length ? (
                <ul className="space-y-2 text-sm text-text-secondary">
                  {page.trackAFeatures.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-text-muted" aria-hidden>
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {ctaLabel ? (
                <Link href={PUBLIC_ROUTES.requestTalent} className="inline-block pt-2">
                  <Button variant="outline">
                    {pageLabels.trackACtaLabel ?? ctaLabel}
                  </Button>
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        {showTrackB ? (
          <Card className="border-2 border-border-accent">
            <CardBody className="space-y-4">
              {pageLabels.trackBTitle ? (
                <SectionEyebrow>{pageLabels.trackBTitle}</SectionEyebrow>
              ) : null}
              {page?.trackBHeadline ? (
                <h2 className="font-serif text-2xl text-text-primary">
                  {page.trackBHeadline}
                </h2>
              ) : null}
              {programLevers && pageLabels.trackBMonthlyLabel ? (
                <p className="font-serif text-4xl text-text-primary">
                  {pageLabels.trackBMonthlyLabel.replace(
                    "{amount}",
                    String(programLevers.trackBMonthly),
                  )}
                </p>
              ) : null}
              {pageLabels.trackBSubprice ? (
                <p className="text-sm text-text-secondary">
                  {pageLabels.trackBSubprice}
                </p>
              ) : null}
              {page?.trackBFeatures?.length ? (
                <ul className="space-y-2 text-sm text-text-secondary">
                  {page.trackBFeatures.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-text-muted" aria-hidden>
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {ctaLabel ? (
                <Link href={PUBLIC_ROUTES.requestTalent} className="inline-block pt-2">
                  <Button>{pageLabels.trackBCtaLabel ?? ctaLabel}</Button>
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {page?.faqItems?.length ? (
        <section className="space-y-6 border-t border-border pt-12">
          {pageLabels.faqTitle ? (
            <SectionEyebrow>{pageLabels.faqTitle}</SectionEyebrow>
          ) : null}
          <div className="divide-y divide-border">
            {page.faqItems.map((item, index) => (
              <div key={`pricing-faq-${index}`} className="py-5">
                <h3 className="font-serif text-xl text-text-primary">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
