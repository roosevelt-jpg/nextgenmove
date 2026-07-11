import { TalentPoolView } from "@/components/employer/talent-pool-view";
import { getEmployerSession } from "@/lib/employer/session";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function TalentPoolPage() {
  const [settings, session] = await Promise.all([
    getSiteSettings(),
    getEmployerSession(),
  ]);
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.employerPageLabels?.talentPool ?? {}),
  };

  const canBrowse =
    session?.company.plan === "track_a" &&
    session.company.subscriptionStatus === "active";

  return <TalentPoolView labels={labels} canBrowse={Boolean(canBrowse)} />;
}
