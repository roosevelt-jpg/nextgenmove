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
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <StudentNav labels={labels} />
      {children}
    </div>
  );
}
