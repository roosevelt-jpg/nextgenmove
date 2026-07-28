import { AdminContactInbox } from "@/components/admin/admin-contact-inbox";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminContactPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.contact ?? {}),
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow || "Inbox"}
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          {labels.title || "Contact"}
        </h1>
        <p className="text-sm text-text-secondary">
          {labels.subtitle ||
            "Public contact form submissions. Reply, note, and update status."}
        </p>
      </header>

      <AdminContactInbox labels={labels} />
    </div>
  );
}
