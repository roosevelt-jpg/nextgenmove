import type { Metadata } from "next";
import { ContactForm } from "@/components/public/contact-form";
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
  const contactPhone = settings.contactPhone?.trim() ?? "";
  const contactAddress = settings.contactAddress?.trim() ?? "";
  const socialLinks = settings.socialLinks ?? [];
  const formFieldLabels = { ...formLabels, ...pageLabels };

  const hasDetails =
    Boolean(contactAddress) ||
    Boolean(contactEmail) ||
    Boolean(contactPhone) ||
    socialLinks.length > 0;

  return (
    <div className="page-section mx-auto max-w-5xl space-y-10">
      <header className="max-w-2xl space-y-3">
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

      <div className="grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
        {hasDetails ? (
          <aside className="space-y-8">
            {contactAddress ? (
              <section className="space-y-2">
                {pageLabels.contactAddressLabel ? (
                  <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                    {pageLabels.contactAddressLabel}
                  </h2>
                ) : null}
                <p className="whitespace-pre-line text-base leading-relaxed text-text-primary">
                  {contactAddress}
                </p>
              </section>
            ) : null}

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

            {contactPhone ? (
              <section className="space-y-2">
                {pageLabels.contactPhoneLabel ? (
                  <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                    {pageLabels.contactPhoneLabel}
                  </h2>
                ) : null}
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="text-lg text-text-accent hover:text-text-primary"
                >
                  {contactPhone}
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
          </aside>
        ) : null}

        <section className={hasDetails ? "" : "md:col-span-2 md:max-w-xl"}>
          {pageLabels.contactFormTitle ? (
            <h2 className="mb-4 font-serif text-xl text-text-primary">
              {pageLabels.contactFormTitle}
            </h2>
          ) : null}
          <ContactForm labels={formFieldLabels} />
        </section>
      </div>
    </div>
  );
}
