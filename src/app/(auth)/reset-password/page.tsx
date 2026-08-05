import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(PORTAL_HOME[user.role]);
  }

  const [labels, settings] = await Promise.all([
    getAuthLabels(),
    getSiteSettings(),
  ]);

  return (
    <AuthSplitShell
      labels={labels}
      siteName={settings.siteName || "Nextgenmove"}
      brandMark={settings.brandMark || "N"}
      logoUrl={undefined}
      panel="signIn"
    >
      <Suspense fallback={null}>
        <ResetPasswordForm labels={labels} />
      </Suspense>
    </AuthSplitShell>
  );
}
