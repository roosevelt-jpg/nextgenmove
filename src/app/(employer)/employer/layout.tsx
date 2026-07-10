import { EmployerNav } from "@/components/employer/employer-nav";
import { PageFrame } from "@/components/layout/page-frame";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function EmployerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = settings.employerNavLabels ?? settings.formLabels ?? {};

  return (
    <PageFrame compact>
      <div className="page-pad flex-1 py-6">
        <EmployerNav labels={labels} />
        {children}
      </div>
    </PageFrame>
  );
}
