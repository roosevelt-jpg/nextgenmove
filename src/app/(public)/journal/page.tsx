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
    <div className="page-section space-y-8">
      <header className="max-w-2xl space-y-3">
        {pageLabels.journalEyebrow || pageLabels.journalTitle ? (
          <SectionEyebrow>
            {pageLabels.journalEyebrow ?? pageLabels.journalTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.journalHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.journalHeadline}
          </h1>
        ) : pageLabels.journalTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.journalTitle}
          </h1>
        ) : null}
        {pageLabels.journalIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">{pageLabels.journalIntro}</p>
        ) : null}
      </header>

      <JournalList articles={articles} labels={formLabels} />

      <div className="rounded-radius border border-border bg-grad-card px-4 py-5 md:flex md:items-center md:justify-between md:gap-6">
        <NewsletterForm labels={formLabels} layout="inline" />
      </div>
    </div>
  );
}
