import { AdminHostingView } from "@/components/admin/admin-hosting-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminHostingPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.hosting ?? {}),
  };

  return <AdminHostingView labels={labels} />;
}
