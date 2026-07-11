import { EmployerDashboardView } from "@/components/employer/employer-dashboard-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function EmployerDashboardPage() {
  const settings = await getSiteSettings();
  const labels =
    settings.employerPageLabels?.dashboard ?? settings.formLabels ?? {};

  return <EmployerDashboardView labels={labels} />;
}
