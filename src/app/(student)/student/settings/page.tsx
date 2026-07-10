import { StudentSettingsView } from "@/components/student/student-settings-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentSettingsPage() {
  const settings = await getSiteSettings();
  const labels = settings.studentPageLabels?.settings ?? settings.formLabels ?? {};
  const notificationKeys = settings.studentNotificationKeys ?? [];

  return (
    <StudentSettingsView labels={labels} notificationKeys={notificationKeys} />
  );
}
