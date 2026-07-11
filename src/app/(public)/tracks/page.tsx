import { SectionEyebrow } from "@/components/ui";
import { RichText } from "@/components/public/rich-text";
import { getPageTracks } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function TracksPage() {
  const [page, settings] = await Promise.all([getPageTracks(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="page-section space-y-8">
      <header className="max-w-2xl space-y-3">
        {pageLabels.tracksEyebrow || pageLabels.tracksTitle ? (
          <SectionEyebrow>
            {pageLabels.tracksEyebrow ?? pageLabels.tracksTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.tracksHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.tracksHeadline}
          </h1>
        ) : pageLabels.tracksTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.tracksTitle}
          </h1>
        ) : null}
        {pageLabels.tracksIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">
            {pageLabels.tracksIntro}
          </p>
        ) : null}
      </header>

      {page?.trackABody ? (
        <section>
          {pageLabels.trackATitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">
              {pageLabels.trackATitle}
            </h2>
          ) : null}
          <RichText html={page.trackABody} />
        </section>
      ) : null}

      {page?.trackBBody ? (
        <section>
          {pageLabels.trackBTitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">
              {pageLabels.trackBTitle}
            </h2>
          ) : null}
          <RichText html={page.trackBBody} />
        </section>
      ) : null}

      {page?.comparisonRows?.length ? (
        <section className="overflow-x-auto">
          {pageLabels.comparisonTitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">
              {pageLabels.comparisonTitle}
            </h2>
          ) : null}
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                {pageLabels.comparisonFeatureColumn ? (
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    {pageLabels.comparisonFeatureColumn}
                  </th>
                ) : null}
                {pageLabels.comparisonTrackAColumn ? (
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    {pageLabels.comparisonTrackAColumn}
                  </th>
                ) : null}
                {pageLabels.comparisonTrackBColumn ? (
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    {pageLabels.comparisonTrackBColumn}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {page.comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-border">
                  <td className="px-4 py-3 text-text-primary">{row.feature}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.trackAValue}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.trackBValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {page?.caseStudyQuote ? (
        <blockquote className="rounded-radius-lg border border-border bg-grad-card p-8">
          {pageLabels.caseStudyEyebrow ? (
            <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-accent">
              {pageLabels.caseStudyEyebrow}
            </p>
          ) : null}
          {page.caseStudyQuote.quote ? (
            <p className="font-serif text-2xl text-text-primary">
              {page.caseStudyQuote.quote}
            </p>
          ) : null}
          {page.caseStudyQuote.companyName ? (
            <footer className="mt-4 text-sm text-text-muted">
              {page.caseStudyQuote.companyName}
              {page.caseStudyQuote.resultStat
                ? ` · ${page.caseStudyQuote.resultStat}`
                : null}
            </footer>
          ) : null}
        </blockquote>
      ) : null}
    </div>
  );
}
