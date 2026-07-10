import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import {
  getAdminDashboardStats,
  getPendingRequests,
  getRecentActivity,
} from "@/lib/admin/dashboard";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminDashboardPage() {
  const [settings, stats, activity, pending] = await Promise.all([
    getSiteSettings(),
    getAdminDashboardStats(),
    getRecentActivity(20),
    getPendingRequests(),
  ]);

  const labels = settings.adminPageLabels?.dashboard ?? settings.formLabels ?? {};

  return (
    <AdminDashboardView
      labels={labels}
      initialStats={stats}
      initialActivity={activity}
      initialPending={pending}
    />
  );
}
