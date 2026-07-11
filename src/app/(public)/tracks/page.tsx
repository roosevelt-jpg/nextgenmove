import Link from "next/link";
import { RichText } from "@/components/public/rich-text";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { Button, Card, CardBody, SectionEyebrow } from "@/components/ui";
import { getPageTracks } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import {
  getPublicHomeMetrics,
  resolveHomeStatBlocks,
} from "@/lib/public/home-stats";
import { PUBLIC_ROUTES } from "@/lib/public/nav";

export default async function TracksPage() {
  const [page, settings, metrics] = await Promise.all([
    getPageTracks(),
    getSiteSettings(),
    getPublicHomeMetrics(),
  ]);
  const pageLabels = settings.pageLabels ?? {};
  const statBlocks = resolveHomeStatBlocks(page?.statBlocks, metrics);
  const ctaLabel = page?.ctaLabel ?? pageLabels.tracksCtaLabel;
  const ctaHref = page?.ctaHref || PUBLIC_ROUTES.requestTalent;

  return (
    <div className="page-section space-y-12">
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

      {statBlocks.length ? (
        <StatBlocksSection statBlocks={statBlocks} valueTone />
      ) : null}

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        {page?.trackABody ? (
          <Card className="h-full">
            <CardBody className="space-y-4 p-5 sm:p-6">
              {pageLabels.trackATitle ? (
                <h2 className="font-serif text-2xl text-text-primary sm:text-3xl">
                  {pageLabels.trackATitle}
                </h2>
              ) : null}
              <RichText html={page.trackABody} />
              {pageLabels.trackACtaLabel || pageLabels.pricing ? (
                <Link href={PUBLIC_ROUTES.pricing} className="inline-block pt-2">
                  <Button>
                    {pageLabels.trackACtaLabel ?? pageLabels.pricing}
                  </Button>
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        {page?.trackBBody ? (
          <Card className="h-full border-2 border-border-accent shadow-sm">
            <CardBody className="space-y-4 p-5 sm:p-6">
              {pageLabels.trackBTitle ? (
                <h2 className="font-serif text-2xl text-text-primary sm:text-3xl">
                  {pageLabels.trackBTitle}
                </h2>
              ) : null}
              <RichText html={page.trackBBody} />
              {pageLabels.trackBCtaLabel || pageLabels.requestTalent ? (
                <Link href={PUBLIC_ROUTES.requestTalent} className="inline-block pt-2">
                  <Button>
                    {pageLabels.trackBCtaLabel ?? pageLabels.requestTalent}
                  </Button>
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {page?.comparisonRows?.length ? (
        <section className="space-y-4">
          {pageLabels.comparisonTitle ? (
            <SectionEyebrow>{pageLabels.comparisonTitle}</SectionEyebrow>
          ) : null}
          {pageLabels.comparisonTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">
              {pageLabels.comparisonTitle}
            </h2>
          ) : null}
          <div className="overflow-x-auto rounded-radius border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-[image:var(--grad-rouse)] text-on-gradient">
                  {pageLabels.comparisonFeatureColumn ? (
                    <th className="px-4 py-3.5 font-medium">
                      {pageLabels.comparisonFeatureColumn}
                    </th>
                  ) : (
                    <th className="px-4 py-3.5 font-medium" />
                  )}
                  {pageLabels.comparisonTrackAColumn ? (
                    <th className="px-4 py-3.5 font-medium">
                      {pageLabels.comparisonTrackAColumn}
                    </th>
                  ) : null}
                  {pageLabels.comparisonTrackBColumn ? (
                    <th className="px-4 py-3.5 font-medium">
                      {pageLabels.comparisonTrackBColumn}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {page.comparisonRows.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={
                      index % 2 === 0
                        ? "border-b border-border bg-surface-1"
                        : "border-b border-border bg-grad-card"
                    }
                  >
                    <td className="px-4 py-3.5 font-medium text-text-primary">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.trackAValue}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.trackBValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {ctaLabel ? (
        <div className="flex flex-col items-start gap-4 rounded-radius border border-border bg-[image:var(--grad-rouse)] px-6 py-8 text-on-gradient sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {pageLabels.tracksCtaBody ? (
            <p className="max-w-xl text-sm opacity-95">{pageLabels.tracksCtaBody}</p>
          ) : null}
          <Link
            href={ctaHref}
            className="inline-flex min-h-8 items-center justify-center rounded-radius-sm bg-white px-3.5 text-xs font-semibold text-brand-indigo-1 hover:opacity-90"
          >
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
