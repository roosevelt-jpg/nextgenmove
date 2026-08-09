import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionEyebrow } from "@/components/ui";
import { RichText } from "@/components/public/rich-text";
import {
  getCmsPageById,
  getSiteSettings,
} from "@/lib/collections/site-settings";
import { isFuturePublishAt } from "@/lib/cms/publish-visibility";

export default async function AdminCmsPagePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [page, settings] = await Promise.all([
    getCmsPageById(id),
    getSiteSettings(),
  ]);

  if (!page) {
    notFound();
  }

  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.content ?? {}),
  };
  const pageLabels = settings.pageLabels ?? {};
  const scheduled = isFuturePublishAt(page.publishAt);
  const statusLabel =
    page.status === "published"
      ? scheduled
        ? labels.previewScheduled ?? "Scheduled"
        : labels.previewPublished ?? "Published"
      : labels.previewDraft ?? "Draft";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-radius border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary">
        <p>
          {labels.previewBanner ?? "Admin preview"} · {statusLabel}
          {page.publishAt ? ` · publishAt ${String(page.publishAt).slice(0, 10)}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {page.slug ? (
            <Link
              href={`/pages/${page.slug}?preview=1`}
              className="text-text-label underline-offset-2 hover:underline"
            >
              {labels.previewPublicLink ?? "Open with ?preview=1"}
            </Link>
          ) : null}
          <Link
            href="/admin/content/pages"
            className="text-text-label underline-offset-2 hover:underline"
          >
            {labels.backToPages ?? "Back to pages"}
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 rounded-radius border border-border bg-surface p-4 md:p-6">
        <header className="space-y-3">
          {page.eyebrow || pageLabels.cmsPageEyebrow ? (
            <SectionEyebrow>
              {page.eyebrow || pageLabels.cmsPageEyebrow}
            </SectionEyebrow>
          ) : null}
          <h2 className="font-serif text-3xl text-text-primary md:text-4xl">
            {page.headline || page.title}
          </h2>
        </header>
        {page.body ? <RichText html={page.body} allowSafeHtml /> : null}
      </article>
    </div>
  );
}
