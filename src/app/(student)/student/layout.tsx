import { StudentNav } from "@/components/student/student-nav";
import { PageFrame } from "@/components/layout/page-frame";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = settings.studentNavLabels ?? settings.formLabels ?? {};

  return (
    <PageFrame compact>
      <div className="page-pad flex-1 py-6">
        <StudentNav labels={labels} />
        {children}
      </div>
    </PageFrame>
  );
}
