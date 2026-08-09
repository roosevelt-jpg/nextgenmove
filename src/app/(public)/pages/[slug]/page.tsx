import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionEyebrow } from "@/components/ui";
import { RichText } from "@/components/public/rich-text";
import {
  getCmsPageBySlugForPreview,
  getPublishedCmsPageBySlug,
  getSiteSettings,
} from "@/lib/collections/site-settings";
import { buildCmsPageMetadata } from "@/lib/public/site-metadata";
import { getAdminSession } from "@/lib/admin/session";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const wantsPreview = query.preview === "1";
  const admin = wantsPreview ? await getAdminSession() : null;

  const [page, settings] = await Promise.all([
    admin
      ? getCmsPageBySlugForPreview(slug)
      : getPublishedCmsPageBySlug(slug),
    getSiteSettings(),
  ]);
  if (!page) return {};
  const meta = buildCmsPageMetadata(page, settings);
  if (admin) {
    return {
      ...meta,
      robots: { index: false, follow: false },
    };
  }
  return meta;
}

export default async function CmsPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const wantsPreview = query.preview === "1";
  const admin = wantsPreview ? await getAdminSession() : null;

  const [page, settings] = await Promise.all([
    admin
      ? getCmsPageBySlugForPreview(slug)
      : getPublishedCmsPageBySlug(slug),
    getSiteSettings(),
  ]);

  if (!page) {
    notFound();
  }

  const pageLabels = settings.pageLabels ?? {};
  const labels = settings.formLabels ?? {};

  return (
    <article className="page-section mx-auto max-w-3xl space-y-6">
      {admin ? (
        <p className="rounded-radius border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary">
          {labels.previewBanner ?? "Admin preview"} · {page.status}
          {page.publishAt
            ? ` · publishAt ${String(page.publishAt).slice(0, 10)}`
            : ""}
        </p>
      ) : null}
      <header className="space-y-3">
        {page.eyebrow || pageLabels.cmsPageEyebrow ? (
          <SectionEyebrow>{page.eyebrow || pageLabels.cmsPageEyebrow}</SectionEyebrow>
        ) : null}
        <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
          {page.headline || page.title}
        </h1>
      </header>
      {page.body ? <RichText html={page.body} allowSafeHtml /> : null}
    </article>
  );
}
