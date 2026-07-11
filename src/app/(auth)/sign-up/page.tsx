import { redirect } from "next/navigation";
import { SignUpPageClient } from "@/components/auth/sign-up-page-client";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(PORTAL_HOME[user.role]);
  }

  const [labels, settings] = await Promise.all([
    getAuthLabels(),
    getSiteSettings(),
  ]);

  return (
    <SignUpPageClient
      labels={labels}
      siteName={settings.siteName || "Venturo"}
      brandMark={settings.brandMark || "V"}
      logoUrl={settings.logoUrl || null}
    />
  );
}
