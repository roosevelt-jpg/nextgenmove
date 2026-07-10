import { AdminContentNav } from "@/components/admin/admin-content-nav";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminContentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  const labels = settings.adminPageLabels?.content ?? settings.formLabels ?? {};

  return (
    <div>
      <AdminContentNav labels={labels} />
      {children}
    </div>
  );
}
