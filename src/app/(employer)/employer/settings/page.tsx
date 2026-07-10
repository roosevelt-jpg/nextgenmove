import { CompanySettingsView } from "@/components/employer/company-settings-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  const labels = settings.employerPageLabels?.settings ?? settings.formLabels ?? {};
  const notificationKeys = settings.employerNotificationKeys ?? [];

  return (
    <CompanySettingsView labels={labels} notificationKeys={notificationKeys} />
  );
}
