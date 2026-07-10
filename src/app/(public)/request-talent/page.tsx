import { RequestTalentForm } from "@/components/public/request-talent-form";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function RequestTalentPage() {
  const settings = await getSiteSettings();
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="space-y-8">
      {pageLabels.requestTalentTitle ?? settings.navLabels?.requestTalent ? (
        <h1 className="font-serif text-4xl text-text-primary">
          {pageLabels.requestTalentTitle ?? settings.navLabels?.requestTalent}
        </h1>
      ) : null}
      {pageLabels.requestTalentIntro ? (
        <p className="max-w-2xl text-text-secondary">{pageLabels.requestTalentIntro}</p>
      ) : null}
      <RequestTalentForm labels={formLabels} />
    </div>
  );
}
