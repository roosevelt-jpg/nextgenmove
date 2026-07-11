import { StudentDashboardView } from "@/components/student/student-dashboard-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentDashboardPage() {
  const settings = await getSiteSettings();
  const labels = settings.studentPageLabels?.dashboard ?? settings.formLabels ?? {};

  return <StudentDashboardView labels={labels} />;
}
