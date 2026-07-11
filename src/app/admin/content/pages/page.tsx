import { AdminEntityListView } from "@/components/admin/admin-entity-list-view";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export default async function AdminCmsPagesPage() {
  const [settings, taxonomies] = await Promise.all([getSiteSettings(), getTaxonomies()]);
  const labels = settings.adminPageLabels?.content ?? settings.formLabels ?? {};

  return (
    <AdminEntityListView
      labels={labels}
      formLabels={settings.formLabels ?? {}}
      taxonomies={taxonomies}
      schema={ENTITY_SCHEMAS.cms_pages!}
      title={labels.pagesTitle ?? labels.pages}
    />
  );
}
