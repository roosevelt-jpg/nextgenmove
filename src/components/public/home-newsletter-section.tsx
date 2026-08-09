"use client";

import type { PageHomeDocument } from "@/types/cms";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { SectionEyebrow } from "@/components/ui";

export function HomeNewsletterSection({
  page,
  formLabels = {},
}: {
  page: PageHomeDocument;
  formLabels?: Record<string, string>;
}) {
  if (!page.newsletterHeadline?.trim() && !page.newsletterEyebrow?.trim()) {
    return null;
  }

  const labels: Record<string, string> = {
    ...formLabels,
    email: formLabels.email ?? "",
    emailPlaceholder: formLabels.emailPlaceholder ?? "",
    newsletterSubmit:
      formLabels.newsletterSubmit ?? formLabels.subscribe ?? formLabels.submit ?? "",
    subscribe: formLabels.subscribe ?? formLabels.newsletterSubmit ?? "",
    successMessage:
      page.newsletterSuccessMessage ?? formLabels.successMessage ?? "",
    corridorLabel: page.newsletterCorridorLabel ?? "",
    email_exists: formLabels.email_exists ?? "",
    genericError: formLabels.genericError ?? "",
  };

  return (
    <section className="page-section">
      <div className="rounded-radius border border-border bg-surface-2 px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 max-w-2xl space-y-1.5">
          {page.newsletterEyebrow ? (
            <SectionEyebrow>{page.newsletterEyebrow}</SectionEyebrow>
          ) : null}
          {page.newsletterHeadline ? (
            <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
              {page.newsletterHeadline}
            </h2>
          ) : null}
          {page.newsletterSubtext ? (
            <p className="text-sm text-text-secondary">
              {page.newsletterSubtext}
            </p>
          ) : null}
        </div>
        <NewsletterForm labels={labels} layout="stack" showCorridor />
      </div>
    </section>
  );
}
