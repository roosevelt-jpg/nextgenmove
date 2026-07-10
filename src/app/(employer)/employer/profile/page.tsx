import { CompanyProfileView } from "@/components/employer/company-profile-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function ProfilePage() {
  const settings = await getSiteSettings();
  const labels = settings.employerPageLabels?.profile ?? settings.formLabels ?? {};

  return <CompanyProfileView labels={labels} />;
}
