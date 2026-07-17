import { StudentJobDetailView } from "@/components/student/student-job-detail-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentJobDetailPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.studentPageLabels?.jobs ?? {}),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] page-pad py-6">
      <StudentJobDetailView labels={labels} />
    </div>
  );
}
