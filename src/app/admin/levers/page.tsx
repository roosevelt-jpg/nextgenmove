import { AdminLeversView } from "@/components/admin/admin-levers-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminLeversPage() {
  const settings = await getSiteSettings();
  const labels = settings.adminPageLabels?.levers ?? settings.formLabels ?? {};

  return <AdminLeversView labels={labels} />;
}
