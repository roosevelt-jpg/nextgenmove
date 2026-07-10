import { JournalList } from "@/components/public/journal-list";
import { NewsletterForm } from "@/components/public/newsletter-form";
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
    <div className="space-y-12">
      {pageLabels.journalTitle ? (
        <h1 className="font-serif text-4xl text-text-primary">{pageLabels.journalTitle}</h1>
      ) : null}
      <JournalList articles={articles} labels={formLabels} />
      <NewsletterForm labels={formLabels} />
    </div>
  );
}
