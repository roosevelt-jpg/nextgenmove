import { ContentStoreView } from "@/components/student/content-store-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentStorePage() {
  const settings = await getSiteSettings();
  const labels = settings.studentPageLabels?.store ?? settings.formLabels ?? {};

  return <ContentStoreView labels={labels} />;
}
