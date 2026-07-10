import { JournalList } from "@/components/public/journal-list";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { SectionEyebrow } from "@/components/ui";
import { getPublishedArticles } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function JournalPage() {
  const [articles, settings] = await Promise.all([
    getPublishedArticles(),
    getSiteSettings(),
  ]);
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 md:py-16">
      <header className="max-w-2xl space-y-3">
        {pageLabels.journalEyebrow || pageLabels.journalTitle ? (
          <SectionEyebrow>
            {pageLabels.journalEyebrow ?? pageLabels.journalTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.journalHeadline ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.journalHeadline}
          </h1>
        ) : pageLabels.journalTitle ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.journalTitle}
          </h1>
        ) : null}
        {pageLabels.journalIntro ? (
          <p className="text-lg text-text-secondary">{pageLabels.journalIntro}</p>
        ) : null}
      </header>

      <JournalList articles={articles} labels={formLabels} />

      <div className="rounded-radius border border-border bg-surface-1 px-6 py-8 md:flex md:items-center md:justify-between md:gap-8 md:px-10">
        <NewsletterForm labels={formLabels} layout="inline" />
      </div>
    </div>
  );
}
