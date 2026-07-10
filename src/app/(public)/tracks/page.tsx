import { RichText } from "@/components/public/rich-text";
import { getPageTracks } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function TracksPage() {
  const [page, settings] = await Promise.all([getPageTracks(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="page-section space-y-8">
      {pageLabels.tracksTitle ? (
        <h1 className="font-serif text-3xl text-text-primary">{pageLabels.tracksTitle}</h1>
      ) : null}

      {page?.trackABody ? (
        <section>
          {pageLabels.trackATitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">{pageLabels.trackATitle}</h2>
          ) : null}
          <RichText html={page.trackABody} />
        </section>
      ) : null}

      {page?.trackBBody ? (
        <section>
          {pageLabels.trackBTitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">{pageLabels.trackBTitle}</h2>
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
        <blockquote className="rounded-radius-lg border border-border bg-surface-1 p-8">
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
