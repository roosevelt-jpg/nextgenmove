import Link from "next/link";
import { Accordion, Button, Card, CardBody } from "@/components/ui";
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
    <div className="space-y-16">
      {pageLabels.pricingTitle ? (
        <h1 className="font-serif text-4xl text-text-primary">{pageLabels.pricingTitle}</h1>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {showTrackA ? (
          <Card>
            <CardBody className="space-y-4">
              {page?.trackAHeadline ? (
                <h2 className="font-serif text-2xl text-text-primary">{page.trackAHeadline}</h2>
              ) : null}
              {programLevers && pageLabels.trackAMonthlyLabel ? (
                <p className="font-mono text-sm text-text-accent">
                  {pageLabels.trackAMonthlyLabel.replace(
                    "{amount}",
                    String(programLevers.trackAMonthly),
                  )}
                </p>
              ) : null}
              {programLevers && pageLabels.trackAMatchFeeLabel ? (
                <p className="font-mono text-sm text-text-accent">
                  {pageLabels.trackAMatchFeeLabel.replace(
                    "{amount}",
                    String(programLevers.trackAMatchFee),
                  )}
                </p>
              ) : null}
              {page?.trackAFeatures?.length ? (
                <ul className="space-y-2 text-sm text-text-secondary">
                  {page.trackAFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        {showTrackB ? (
          <Card>
            <CardBody className="space-y-4">
              {page?.trackBHeadline ? (
                <h2 className="font-serif text-2xl text-text-primary">{page.trackBHeadline}</h2>
              ) : null}
              {programLevers && pageLabels.trackBMonthlyLabel ? (
                <p className="font-mono text-sm text-text-accent">
                  {pageLabels.trackBMonthlyLabel.replace(
                    "{amount}",
                    String(programLevers.trackBMonthly),
                  )}
                </p>
              ) : null}
              {page?.trackBFeatures?.length ? (
                <ul className="space-y-2 text-sm text-text-secondary">
                  {page.trackBFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {ctaLabel ? (
        <Link href={PUBLIC_ROUTES.requestTalent}>
          <Button>{ctaLabel}</Button>
        </Link>
      ) : null}

      {page?.faqItems?.length ? (
        <section className="space-y-4">
          {pageLabels.faqTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{pageLabels.faqTitle}</h2>
          ) : null}
          <Accordion
            items={page.faqItems.map((item, index) => ({
              id: `pricing-faq-${index}`,
              title: item.question,
              content: item.answer,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
