import type { Metadata } from "next";
import { SocialLinks } from "@/components/public/social-links";
import { SectionEyebrow } from "@/components/ui";
import { getSiteSettings } from "@/lib/collections/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const pageLabels = settings.pageLabels ?? {};
  const siteName = settings.siteName?.trim();
  const title =
    pageLabels.contactMetaTitle?.trim() ||
    pageLabels.contactTitle?.trim() ||
    settings.defaultMetaTitle?.trim() ||
    siteName;
  const description =
    pageLabels.contactMetaDescription?.trim() ||
    pageLabels.contactSubtitle?.trim() ||
    settings.defaultMetaDescription?.trim() ||
    settings.siteDescription?.trim() ||
    undefined;

  return {
    title,
    description,
    openGraph: {
      title: title || undefined,
      description,
      siteName,
      type: "website",
    },
  };
}

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};
  const contactEmail = settings.contactEmail?.trim() ?? "";
  const socialLinks = settings.socialLinks ?? [];

  return (
    <div className="page-section mx-auto max-w-2xl space-y-10">
      <header className="space-y-3">
        {pageLabels.contactEyebrow ? (
          <SectionEyebrow>{pageLabels.contactEyebrow}</SectionEyebrow>
        ) : null}
        {pageLabels.contactTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.contactTitle}
          </h1>
        ) : null}
        {pageLabels.contactSubtitle ? (
          <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
            {pageLabels.contactSubtitle}
          </p>
        ) : null}
      </header>

      {contactEmail ? (
        <section className="space-y-2">
          {pageLabels.contactEmailLabel ? (
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              {pageLabels.contactEmailLabel}
            </h2>
          ) : null}
          <a
            href={`mailto:${contactEmail}`}
            className="text-lg text-text-accent hover:text-text-primary"
          >
            {contactEmail}
          </a>
        </section>
      ) : null}

      {socialLinks.length > 0 ? (
        <section className="space-y-3">
          {pageLabels.contactSocialTitle ? (
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              {pageLabels.contactSocialTitle}
            </h2>
          ) : null}
          <SocialLinks links={socialLinks} platformLabels={formLabels} />
        </section>
      ) : null}
    </div>
  );
}
