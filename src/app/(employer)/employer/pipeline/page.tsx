import { PipelineView } from "@/components/employer/pipeline-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function PipelinePage() {
  const settings = await getSiteSettings();
  const labels = settings.employerPageLabels?.pipeline ?? settings.formLabels ?? {};

  return <PipelineView labels={labels} />;
}
