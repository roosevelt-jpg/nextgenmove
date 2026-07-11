import { AccountProfileView } from "@/components/account/account-profile-view";
import { CompanySettingsView } from "@/components/employer/company-settings-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  const companyLabels =
    settings.employerPageLabels?.settings ?? settings.formLabels ?? {};
  const accountLabels = {
    ...(settings.formLabels ?? {}),
    ...(settings.employerPageLabels?.account ?? {}),
  };
  const notificationKeys = settings.employerNotificationKeys ?? [];

  return (
    <div className="space-y-10">
      <AccountProfileView
        labels={accountLabels}
        notificationKeys={notificationKeys}
        storagePath="users/company"
        roleLabel={accountLabels.roleCompany}
      />
      <CompanySettingsView labels={companyLabels} notificationKeys={[]} />
    </div>
  );
}
