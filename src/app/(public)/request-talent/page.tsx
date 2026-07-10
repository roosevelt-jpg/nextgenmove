import { RequestTalentForm } from "@/components/public/request-talent-form";
import { Card, CardBody, SectionEyebrow } from "@/components/ui";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function RequestTalentPage() {
  const settings = await getSiteSettings();
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 md:py-16">
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
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.requestTalentHeadline}
          </h1>
        ) : pageLabels.requestTalentTitle || settings.navLabels?.requestTalent ? (
          <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
            {pageLabels.requestTalentTitle ?? settings.navLabels?.requestTalent}
          </h1>
        ) : null}
        {pageLabels.requestTalentIntro ? (
          <p className="text-lg text-text-secondary">{pageLabels.requestTalentIntro}</p>
        ) : null}
      </header>

      <Card className="max-w-4xl">
        <CardBody className="p-6 md:p-8">
          <RequestTalentForm labels={formLabels} />
        </CardBody>
      </Card>
    </div>
  );
}
