import { AdminSingletonEditor } from "@/components/admin/admin-singleton-editor";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export default async function AdminSiteSettingsPage() {
  const [settings, taxonomies] = await Promise.all([getSiteSettings(), getTaxonomies()]);
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.content ?? {}),
    siteName: "Site name",
    tagline: "Tagline",
    logoUrl: "Logo",
    contactEmail: "Contact email",
    navLabels: "Navigation labels",
    howItWorks: "How it works",
    forCompanies: "For companies",
    pricing: "Pricing",
    signIn: "Sign in",
    headerCta: "Header CTA",
    headerCtaHref: "Header CTA link",
    about: "About",
    careers: "Careers",
    journal: "Journal",
    browseRoles: "Browse roles",
    credits: "Credits",
    tracks: "Tracks",
    requestTalent: "Request talent",
    companySection: "Company section",
    talentSection: "Talent section",
    employersSection: "Employers section",
  };

  return (
    <AdminSingletonEditor
      labels={labels}
      formLabels={settings.formLabels ?? {}}
      taxonomies={taxonomies}
      schema={ENTITY_SCHEMAS.site_settings!}
      title={labels.settingsTitle ?? "Site settings"}
    />
  );
}
