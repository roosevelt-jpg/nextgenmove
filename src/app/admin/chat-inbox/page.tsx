import { AdminChatInbox } from "@/components/admin/admin-chat-inbox";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminChatInboxPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.chatInbox ?? {}),
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow || "Inbox"}
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          {labels.title || "Public chat"}
        </h1>
        <p className="text-sm text-text-secondary">
          {labels.subtitle ||
            "Transcripts from the public website chatbot. Reply when a visitor needs a human."}
        </p>
      </header>
      <AdminChatInbox labels={labels} />
    </div>
  );
}
