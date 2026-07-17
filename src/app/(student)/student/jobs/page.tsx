import { StudentJobBoardView } from "@/components/student/student-job-board-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentJobsPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.studentPageLabels?.jobs ?? {}),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] page-pad py-6">
      <StudentJobBoardView labels={labels} />
    </div>
  );
}
