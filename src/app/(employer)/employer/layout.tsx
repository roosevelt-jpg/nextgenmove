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
    <div className="portal-shell flex-1 py-6">
      <EmployerNav labels={labels} />
      {children}
    </div>
  );
}
