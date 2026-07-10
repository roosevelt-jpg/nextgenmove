import { StudentProfileView } from "@/components/student/student-profile-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentProfilePage() {
  const settings = await getSiteSettings();
  const labels = settings.studentPageLabels?.profile ?? settings.formLabels ?? {};

  return <StudentProfileView labels={labels} />;
}
