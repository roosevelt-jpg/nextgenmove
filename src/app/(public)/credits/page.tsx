import { Card, CardBody, SectionEyebrow } from "@/components/ui";
import { getLiveContentItems, getProgramLevers } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function CreditsPage() {
  const [contentItems, programLevers, settings] = await Promise.all([
    getLiveContentItems(),
    getProgramLevers(),
    getSiteSettings(),
  ]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 md:py-16">
      <header className="max-w-2xl space-y-3">
        {pageLabels.creditsEyebrow || pageLabels.creditsTitle ? (
          <SectionEyebrow>
            {pageLabels.creditsEyebrow ?? pageLabels.creditsTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.creditsHeadline ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.creditsHeadline}
          </h1>
        ) : pageLabels.creditsTitle ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.creditsTitle}
          </h1>
        ) : null}
        {pageLabels.creditsIntro ? (
          <p className="text-lg text-text-secondary">{pageLabels.creditsIntro}</p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {programLevers?.waysToEarn?.length ? (
          <Card>
            <CardBody className="p-0">
              {pageLabels.creditsWaysToEarnTitle ? (
                <div className="border-b border-border px-6 py-4">
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-text-accent">
                    {pageLabels.creditsWaysToEarnTitle}
                  </p>
                </div>
              ) : null}
              <ul className="divide-y divide-border">
                {programLevers.waysToEarn.map((way) => (
                  <li
                    key={way.id}
                    className="flex items-start justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <h3 className="font-medium text-text-primary">{way.action}</h3>
                      {way.description ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          {way.description}
                        </p>
                      ) : null}
                    </div>
                    {pageLabels.creditsEarnLabel ? (
                      <span className="shrink-0 font-serif text-lg text-text-primary">
                        {pageLabels.creditsEarnLabel.replace(
                          "{credits}",
                          String(way.credits),
                        )}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        {contentItems.length ? (
          <Card>
            <CardBody className="p-0">
              {pageLabels.creditsContentTitle ? (
                <div className="border-b border-border px-6 py-4">
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-text-success">
                    {pageLabels.creditsContentTitle}
                  </p>
                </div>
              ) : null}
              <ul className="divide-y divide-border">
                {contentItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <h3 className="font-medium text-text-primary">{item.title}</h3>
                      {item.category || item.description ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          {item.category || item.description}
                        </p>
                      ) : null}
                    </div>
                    {item.costCredits != null && pageLabels.creditsCostLabel ? (
                      <span className="shrink-0 font-serif text-lg text-text-primary">
                        {pageLabels.creditsCostLabel.replace(
                          "{credits}",
                          String(item.costCredits),
                        )}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
