import { redirect } from "next/navigation";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function ForgotPasswordPage() {
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
      siteName={settings.siteName || "Venturo"}
      brandMark={settings.brandMark || "V"}
      logoUrl={settings.logoUrl || null}
      panel="signIn"
    >
      <ForgotPasswordForm labels={labels} />
    </AuthSplitShell>
  );
}
