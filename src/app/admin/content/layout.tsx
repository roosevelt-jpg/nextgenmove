import { AdminContentShell } from "@/components/admin/admin-content-shell";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminContentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  const labels = settings.adminPageLabels?.content ?? settings.formLabels ?? {};

  return <AdminContentShell labels={labels}>{children}</AdminContentShell>;
}
