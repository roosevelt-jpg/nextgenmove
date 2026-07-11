import { AdminUsersView } from "@/components/admin/admin-users-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminUsersPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.users ?? {}),
  };

  return <AdminUsersView labels={labels} />;
}
