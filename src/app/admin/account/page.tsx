import { AccountProfileView } from "@/components/account/account-profile-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminAccountPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.account ?? {}),
  };
  const notificationKeys = settings.adminNotificationKeys ?? [
    "pending_requests",
    "weekly_digest",
    "sms_alerts",
  ];

  return (
    <AccountProfileView
      labels={labels}
      notificationKeys={notificationKeys}
      storagePath="users/admin"
      roleLabel={labels.roleAdmin}
    />
  );
}
