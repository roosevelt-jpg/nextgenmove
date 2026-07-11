import { StudentNav } from "@/components/student/student-nav";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = settings.studentNavLabels ?? settings.formLabels ?? {};

  return (
    <div className="portal-shell flex-1 py-6">
      <StudentNav labels={labels} />
      {children}
    </div>
  );
}
