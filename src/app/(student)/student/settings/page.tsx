import { AccountProfileView } from "@/components/account/account-profile-view";
import { StudentSettingsView } from "@/components/student/student-settings-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentSettingsPage() {
  const settings = await getSiteSettings();
  const settingsLabels =
    settings.studentPageLabels?.settings ?? settings.formLabels ?? {};
  const accountLabels = {
    ...(settings.formLabels ?? {}),
    ...(settings.studentPageLabels?.account ?? {}),
    ...(settings.studentPageLabels?.settings ?? {}),
  };
  const notificationKeys = settings.studentNotificationKeys ?? [];

  return (
    <div className="space-y-10">
      <AccountProfileView
        labels={accountLabels}
        notificationKeys={notificationKeys}
        storagePath="users/student"
        roleLabel={accountLabels.roleStudent}
      />
      <StudentSettingsView labels={settingsLabels} notificationKeys={[]} />
    </div>
  );
}
