import { notFound } from "next/navigation";
import { SectionEyebrow } from "@/components/ui";
import {
  getPublishedCmsPageBySlug,
  getSiteSettings,
} from "@/lib/collections/site-settings";

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, settings] = await Promise.all([
    getPublishedCmsPageBySlug(slug),
    getSiteSettings(),
  ]);

  if (!page) {
    notFound();
  }

  const pageLabels = settings.pageLabels ?? {};

  return (
    <article className="page-section mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        {page.eyebrow || pageLabels.cmsPageEyebrow ? (
          <SectionEyebrow>{page.eyebrow || pageLabels.cmsPageEyebrow}</SectionEyebrow>
        ) : null}
        <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
          {page.headline || page.title}
        </h1>
      </header>
      {page.body ? (
        <div
          className="prose prose-neutral max-w-none text-text-secondary"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : null}
    </article>
  );
}
