import { AdminUsersView } from "@/components/admin/admin-users-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminUsersPage() {
  const settings = await getSiteSettings();
  const labels = settings.adminPageLabels?.users ?? settings.formLabels ?? {};

  return <AdminUsersView labels={labels} />;
}
