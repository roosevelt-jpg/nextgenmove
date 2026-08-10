import { StudentJobBoardView } from "@/components/student/student-job-board-view";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { FALLBACK_MARKETPLACE_LABELS } from "@/lib/public/cms-fallbacks";

export default async function StudentJobsPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...FALLBACK_MARKETPLACE_LABELS,
    ...(settings.formLabels ?? {}),
    ...(settings.studentPageLabels?.jobs ?? {}),
    ...(settings.studentPageLabels?.marketplace ?? {}),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] page-pad py-6">
      <StudentJobBoardView labels={labels} />
    </div>
  );
}
