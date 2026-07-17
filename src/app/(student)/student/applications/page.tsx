import { StudentApplicationsView } from "@/components/student/student-applications-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentApplicationsPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.studentPageLabels?.applications ?? {}),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] page-pad py-6">
      <StudentApplicationsView labels={labels} />
    </div>
  );
}
