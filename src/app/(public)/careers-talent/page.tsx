import { PublicRolesList } from "@/components/public/public-roles-list";
import { SectionEyebrow } from "@/components/ui";
import { getOpenPublicRoles } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function BrowseRolesPage() {
  const [roles, settings] = await Promise.all([getOpenPublicRoles(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="page-section space-y-6">
      <header className="max-w-2xl space-y-3">
        {pageLabels.browseRolesEyebrow ||
        pageLabels.browseRolesTitle ||
        settings.navLabels?.browseRoles ? (
          <SectionEyebrow>
            {pageLabels.browseRolesEyebrow ??
              pageLabels.browseRolesTitle ??
              settings.navLabels?.browseRoles}
          </SectionEyebrow>
        ) : null}
        {pageLabels.browseRolesHeadline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.browseRolesHeadline}
          </h1>
        ) : pageLabels.browseRolesTitle || settings.navLabels?.browseRoles ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {pageLabels.browseRolesTitle ?? settings.navLabels?.browseRoles}
          </h1>
        ) : null}
        {pageLabels.browseRolesIntro ? (
          <p className="text-sm text-text-secondary sm:text-base">{pageLabels.browseRolesIntro}</p>
        ) : null}
      </header>

      <PublicRolesList roles={roles} labels={formLabels} />
    </div>
  );
}
