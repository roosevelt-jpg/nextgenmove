import { AdminSettingsView } from "@/components/admin/admin-settings-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminSiteSettingsPage() {
  const settings = await getSiteSettings();
  const contentLabels = settings.adminPageLabels?.content ?? {};
  const settingsLabels = settings.adminPageLabels?.settings ?? {};
  const labels = {
    ...(settings.formLabels ?? {}),
    ...contentLabels,
    ...settingsLabels,
  };

  return (
    <AdminSettingsView
      labels={labels}
      settings={settings as Record<string, unknown>}
      socialLinks={settings.socialLinks ?? []}
    />
  );
}
