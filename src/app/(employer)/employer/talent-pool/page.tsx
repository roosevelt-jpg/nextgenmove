import { TalentPoolView } from "@/components/employer/talent-pool-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function TalentPoolPage() {
  const settings = await getSiteSettings();
  const labels = settings.employerPageLabels?.talentPool ?? settings.formLabels ?? {};

  return <TalentPoolView labels={labels} />;
}
