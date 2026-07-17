import { getSiteSettings } from "@/lib/collections/site-settings";
import { EmployerJobsView } from "@/components/employer/employer-jobs-view";

export default async function EmployerJobsPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.employerPageLabels?.jobs ?? {}),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] page-pad py-6">
      <EmployerJobsView labels={labels} />
    </div>
  );
}
