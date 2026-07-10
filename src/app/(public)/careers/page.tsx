import { CareersList } from "@/components/public/careers-list";
import { getOpenJobPostings } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function CareersPage() {
  const [jobs, settings] = await Promise.all([getOpenJobPostings(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="space-y-8">
      {pageLabels.careersTitle ? (
        <h1 className="font-serif text-4xl text-text-primary">{pageLabels.careersTitle}</h1>
      ) : null}
      {pageLabels.careersIntro ? (
        <p className="max-w-2xl text-text-secondary">{pageLabels.careersIntro}</p>
      ) : null}
      <CareersList jobs={jobs} labels={formLabels} />
    </div>
  );
}
