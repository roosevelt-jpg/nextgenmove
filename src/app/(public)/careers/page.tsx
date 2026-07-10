import { CareersList } from "@/components/public/careers-list";
import { SectionEyebrow } from "@/components/ui";
import { getOpenJobPostings } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function CareersPage() {
  const [jobs, settings] = await Promise.all([getOpenJobPostings(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="page-section space-y-6">
      <header className="max-w-2xl space-y-3">
        {pageLabels.careersEyebrow || pageLabels.careersTitle ? (
          <SectionEyebrow>
            {pageLabels.careersEyebrow ?? pageLabels.careersTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.careersHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.careersHeadline}
          </h1>
        ) : pageLabels.careersTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.careersTitle}
          </h1>
        ) : null}
        {pageLabels.careersIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">{pageLabels.careersIntro}</p>
        ) : null}
      </header>

      <CareersList jobs={jobs} labels={formLabels} />
    </div>
  );
}
