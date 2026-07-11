import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { getAdminDashboardStats } from "@/lib/admin/dashboard";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminDashboardPage() {
  const [settings, stats] = await Promise.all([
    getSiteSettings(),
    getAdminDashboardStats(),
  ]);

  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.dashboard ?? {}),
  };

  return <AdminDashboardView labels={labels} initialStats={stats} />;
}
