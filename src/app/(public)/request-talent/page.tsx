import { RequestTalentForm } from "@/components/public/request-talent-form";
import { Card, CardBody, SectionEyebrow } from "@/components/ui";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function RequestTalentPage() {
  const settings = await getSiteSettings();
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="page-section">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center space-y-6">
        <header className="w-full space-y-3 text-center">
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
          ) : pageLabels.requestTalentTitle ||
            settings.navLabels?.requestTalent ? (
            <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
              {pageLabels.requestTalentTitle ?? settings.navLabels?.requestTalent}
            </h1>
          ) : null}
          {pageLabels.requestTalentIntro ? (
            <p className="text-sm text-text-secondary sm:text-base">
              {pageLabels.requestTalentIntro}
            </p>
          ) : null}
        </header>

        <Card className="w-full">
          <CardBody>
            <RequestTalentForm labels={formLabels} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
