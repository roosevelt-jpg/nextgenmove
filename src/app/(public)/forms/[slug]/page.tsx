import { notFound } from "next/navigation";
import { CmsFormView } from "@/components/public/cms-form-view";
import { Card, CardBody, SectionEyebrow } from "@/components/ui";
import {
  getPublishedCmsFormBySlug,
  getSiteSettings,
} from "@/lib/collections/site-settings";

export default async function CmsFormRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [form, settings] = await Promise.all([
    getPublishedCmsFormBySlug(slug),
    getSiteSettings(),
  ]);

  if (!form) {
    notFound();
  }

  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="page-section">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center space-y-6">
        <header className="w-full space-y-3 text-center">
          {pageLabels.cmsFormEyebrow ? (
            <SectionEyebrow>{pageLabels.cmsFormEyebrow}</SectionEyebrow>
          ) : null}
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {form.title}
          </h1>
        </header>
        <Card className="w-full">
          <CardBody>
            <CmsFormView form={form} labels={formLabels} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
