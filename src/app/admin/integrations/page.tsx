import { AdminIntegrationsView } from "@/components/admin/admin-integrations-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminIntegrationsPage() {
  const settings = await getSiteSettings();
  const labels = settings.adminPageLabels?.integrations ?? settings.formLabels ?? {};

  return <AdminIntegrationsView labels={labels} />;
}
