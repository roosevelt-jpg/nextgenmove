import { RequestTalentForm } from "@/components/public/request-talent-form";
import { Card, CardBody, SectionEyebrow } from "@/components/ui";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function RequestTalentPage() {
  const settings = await getSiteSettings();
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="page-section space-y-6">
      <header className="max-w-2xl space-y-3">
        {pageLabels.requestTalentEyebrow ||
        pageLabels.requestTalentTitle ||
        settings.navLabels?.requestTalent ? (
          <SectionEyebrow>
            {pageLabels.requestTalentEyebrow ??
              pageLabels.requestTalentTitle ??
              settings.navLabels?.requestTalent}
          </SectionEyebrow>
        ) : null}
        {pageLabels.requestTalentHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.requestTalentHeadline}
          </h1>
        ) : pageLabels.requestTalentTitle || settings.navLabels?.requestTalent ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.requestTalentTitle ?? settings.navLabels?.requestTalent}
          </h1>
        ) : null}
        {pageLabels.requestTalentIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">{pageLabels.requestTalentIntro}</p>
        ) : null}
      </header>

      <Card className="max-w-xl">
        <CardBody>
          <RequestTalentForm labels={formLabels} />
        </CardBody>
      </Card>
    </div>
  );
}
