import { redirect } from "next/navigation";
import { SignUpPageClient } from "@/components/auth/sign-up-page-client";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import { getProfileOnboardingState } from "@/lib/auth/profile-onboarding";
import { getSiteSettings } from "@/lib/collections/site-settings";
import type { SignUpRole } from "@/types/user";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  let resume:
    | {
        uid: string;
        role: SignUpRole;
        email: string;
        phone: string | null;
        emailVerified: boolean;
        phoneVerified: boolean;
        nextStep: "verify" | "media";
      }
    | undefined;

  if (user) {
    if (user.role === "admin") {
      redirect(PORTAL_HOME.admin);
    }

    const onboarding = await getProfileOnboardingState(user.uid);
    if (onboarding.profileComplete || onboarding.nextStep === "done") {
      redirect(PORTAL_HOME[user.role]);
    }

    if (
      (user.role === "student" || user.role === "company") &&
      (onboarding.nextStep === "verify" || onboarding.nextStep === "media")
    ) {
      resume = {
        uid: user.uid,
        role: user.role,
        email: onboarding.email || user.email || "",
        phone: onboarding.phone,
        emailVerified: onboarding.emailVerified,
        phoneVerified: onboarding.phoneVerified,
        nextStep: onboarding.nextStep,
      };
    }
  }

  const [labels, settings] = await Promise.all([
    getAuthLabels(),
    getSiteSettings(),
  ]);

  return (
    <SignUpPageClient
      labels={labels}
      siteName={settings.siteName || "Nextgenmove"}
      brandMark={settings.brandMark || "N"}
      logoUrl={undefined}
      googleSignInEnabled={Boolean(settings.googleSignInEnabled)}
      resume={resume}
    />
  );
}
