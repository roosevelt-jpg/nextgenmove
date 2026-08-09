import { AdminComplianceView } from "@/components/admin/admin-compliance-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

const FALLBACK_LABELS = {
  eyebrow: "Compliance locker",
  title: "Consent & DSAR",
  subtitle:
    "Review consent timelines and PII access events. Students and employers can export their data from settings; account deactivation anonymizes personal fields.",
  consentsTitle: "Recent consent records",
  consentsEmpty: "No consent records found.",
  colCreated: "Created",
  colUser: "User",
  colSource: "Source",
  colRequired: "Required",
  colMarketing: "Marketing",
  yes: "yes",
  no: "no",
  piiTitle: "PII access audit",
  piiSubtitle: "Recent unlock and profile-view events (latest 50).",
  piiEmpty: "No PII access events found.",
  colActor: "Actor",
  colStudent: "Student",
  colAction: "Action",
  colMeta: "Meta",
  loadError: "Could not load consent records.",
};

export default async function AdminCompliancePage() {
  const settings = await getSiteSettings();
  const labels = {
    ...FALLBACK_LABELS,
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.compliance ?? {}),
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow}
        </p>
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
        {labels.subtitle ? (
          <p className="max-w-2xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      <AdminComplianceView labels={labels} />
    </div>
  );
}
