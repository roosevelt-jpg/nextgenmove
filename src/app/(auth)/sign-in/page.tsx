import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function SignInPage() {
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
      panel="signIn"
    >
      <Suspense fallback={null}>
        <SignInForm labels={labels} />
      </Suspense>
    </AuthSplitShell>
  );
}
