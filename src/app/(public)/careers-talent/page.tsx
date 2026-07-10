import { PublicRolesList } from "@/components/public/public-roles-list";
import { getOpenPublicRoles } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function BrowseRolesPage() {
  const [roles, settings] = await Promise.all([getOpenPublicRoles(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};
  const formLabels = settings.formLabels ?? {};

  return (
    <div className="space-y-8">
      {pageLabels.browseRolesTitle ?? settings.navLabels?.browseRoles ? (
        <h1 className="font-serif text-4xl text-text-primary">
          {pageLabels.browseRolesTitle ?? settings.navLabels?.browseRoles}
        </h1>
      ) : null}
      {pageLabels.browseRolesIntro ? (
        <p className="max-w-2xl text-text-secondary">{pageLabels.browseRolesIntro}</p>
      ) : null}
      <PublicRolesList roles={roles} labels={formLabels} />
    </div>
  );
}
