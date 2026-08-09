import { StudentDashboardView } from "@/components/student/student-dashboard-view";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getPageHome } from "@/lib/collections/pages";

function pickDefined(
  entries: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

export default async function StudentDashboardPage() {
  const [settings, pageHome] = await Promise.all([
    getSiteSettings(),
    getPageHome(),
  ]);
  const labels = {
    ...(settings.studentPageLabels?.dashboard ?? settings.formLabels ?? {}),
    ...pickDefined({
      corridorIntelEyebrow: pageHome.corridorIntelEyebrow,
      corridorIntelHeadline: pageHome.corridorIntelHeadline,
      corridorIntelSubtext: pageHome.corridorIntelSubtext,
      corridorIntelSkillsLabel: pageHome.corridorIntelSkillsLabel,
      corridorIntelCitiesLabel: pageHome.corridorIntelCitiesLabel,
      corridorIntelNationalitiesLabel: pageHome.corridorIntelNationalitiesLabel,
      corridorIntelEmptyText: pageHome.corridorIntelEmptyText,
    }),
  };

  return <StudentDashboardView labels={labels} />;
}
