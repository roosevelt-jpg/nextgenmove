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
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <EmployerNav labels={labels} />
      {children}
    </div>
  );
}
