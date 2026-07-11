import { StudentWalletPanel } from "@/components/student/student-wallet-panel";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function StudentWalletPage() {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.studentPageLabels?.dashboard ?? {}),
    ...(settings.studentPageLabels?.settings ?? {}),
    ...(settings.studentPageLabels?.wallet ?? {}),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.walletEyebrow ?? "Wallet"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {labels.walletPageTitle ?? "Credits & history"}
        </h1>
        {labels.walletPageSubtitle ? (
          <p className="max-w-xl text-sm text-text-secondary">
            {labels.walletPageSubtitle}
          </p>
        ) : null}
      </header>
      <StudentWalletPanel labels={labels} historyLimit={200} />
    </div>
  );
}
