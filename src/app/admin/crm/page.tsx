import { AdminCrmView } from "@/components/admin/admin-crm-view";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [settings, taxonomies, params] = await Promise.all([
    getSiteSettings(),
    getTaxonomies(),
    searchParams,
  ]);
  const labels = settings.adminPageLabels?.crm ?? settings.formLabels ?? {};
  const tabParam = params.tab;
  const initialTab =
    tabParam === "companies" ||
    tabParam === "students" ||
    tabParam === "contacts"
      ? tabParam
      : "contacts";

  return (
    <AdminCrmView
      labels={labels}
      formLabels={settings.formLabels ?? {}}
      taxonomies={taxonomies}
      initialTab={initialTab}
    />
  );
}
