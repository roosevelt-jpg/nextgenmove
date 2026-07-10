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
    <div className="space-y-16">
      {pageLabels.creditsTitle ? (
        <h1 className="font-serif text-4xl text-text-primary">{pageLabels.creditsTitle}</h1>
      ) : null}

      {contentItems.length ? (
        <section className="space-y-6">
          {pageLabels.creditsContentTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">
              {pageLabels.creditsContentTitle}
            </h2>
          ) : null}
          <ul className="grid gap-4 md:grid-cols-2">
            {contentItems.map((item) => (
              <li
                key={item.id}
                className="rounded-radius border border-border bg-surface-1 p-5"
              >
                <h3 className="font-serif text-xl text-text-primary">{item.title}</h3>
                {item.description ? (
                  <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
                ) : null}
                {item.costCredits != null && pageLabels.creditsCostLabel ? (
                  <p className="mt-3 font-mono text-xs uppercase tracking-wide text-text-accent">
                    {pageLabels.creditsCostLabel.replace(
                      "{credits}",
                      String(item.costCredits),
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {programLevers?.waysToEarn?.length ? (
        <section className="space-y-6">
          {pageLabels.creditsWaysToEarnTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">
              {pageLabels.creditsWaysToEarnTitle}
            </h2>
          ) : null}
          <ul className="space-y-3">
            {programLevers.waysToEarn.map((way) => (
              <li
                key={way.id}
                className="rounded-radius border border-border bg-surface-1 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-text-primary">{way.action}</h3>
                    {way.description ? (
                      <p className="mt-1 text-sm text-text-secondary">{way.description}</p>
                    ) : null}
                  </div>
                  {pageLabels.creditsEarnLabel ? (
                    <span className="font-mono text-xs uppercase tracking-wide text-text-accent">
                      {pageLabels.creditsEarnLabel.replace("{credits}", String(way.credits))}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
