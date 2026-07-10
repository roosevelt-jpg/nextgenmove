import { EmployerNav } from "@/components/employer/employer-nav";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function EmployerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = settings.employerNavLabels ?? settings.formLabels ?? {};

  return (
    <div className="page-container mx-auto w-full max-w-page flex-1 py-6">
      <EmployerNav labels={labels} />
      {children}
    </div>
  );
}
