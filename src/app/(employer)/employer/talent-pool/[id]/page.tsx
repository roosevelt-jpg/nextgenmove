import { CandidateProfileView } from "@/components/employer/candidate-profile-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function CandidateProfilePage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.employerPageLabels?.talentPool ?? {}),
    ...(settings.employerPageLabels?.candidateProfile ?? {}),
  };

  return <CandidateProfileView labels={labels} />;
}
