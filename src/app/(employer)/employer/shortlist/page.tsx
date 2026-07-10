import { ShortlistView } from "@/components/employer/shortlist-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function ShortlistPage() {
  const settings = await getSiteSettings();
  const labels = settings.employerPageLabels?.shortlist ?? settings.formLabels ?? {};

  return <ShortlistView labels={labels} />;
}
