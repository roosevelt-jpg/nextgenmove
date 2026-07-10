import { AdminCrmView } from "@/components/admin/admin-crm-view";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export default async function AdminCrmPage() {
  const [settings, taxonomies] = await Promise.all([getSiteSettings(), getTaxonomies()]);
  const labels = settings.adminPageLabels?.crm ?? settings.formLabels ?? {};

  return (
    <AdminCrmView
      labels={labels}
      formLabels={settings.formLabels ?? {}}
      taxonomies={taxonomies}
    />
  );
}
