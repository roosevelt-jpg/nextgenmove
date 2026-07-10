import { CareersList } from "@/components/public/careers-list";
import { SectionEyebrow } from "@/components/ui";
import { getOpenJobPostings } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function CareersPage() {
  const [jobs, settings] = await Promise.all([getOpenJobPostings(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 md:py-16">
      <header className="max-w-2xl space-y-3">
        {pageLabels.careersEyebrow || pageLabels.careersTitle ? (
          <SectionEyebrow>
            {pageLabels.careersEyebrow ?? pageLabels.careersTitle}
          </SectionEyebrow>
        ) : null}
        {pageLabels.careersHeadline ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.careersHeadline}
          </h1>
        ) : pageLabels.careersTitle ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.careersTitle}
          </h1>
        ) : null}
        {pageLabels.careersIntro ? (
          <p className="text-lg text-text-secondary">{pageLabels.careersIntro}</p>
        ) : null}
      </header>

      <CareersList jobs={jobs} labels={formLabels} />
    </div>
  );
}
