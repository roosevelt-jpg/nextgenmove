"use client";

import { useState } from "react";
import {
  AuthSplitShell,
  type AuthPanel,
} from "@/components/auth/auth-split-shell";
import {
  SignUpForm,
  type SignUpResumeState,
} from "@/components/auth/sign-up-form";
import type { AuthLabels, SignUpRole } from "@/types/user";

export function SignUpPageClient({
  labels,
  siteName,
  brandMark,
  logoUrl,
  googleSignInEnabled = false,
  resume,
}: {
  labels: AuthLabels;
  siteName: string;
  brandMark: string;
  logoUrl?: string | null;
  googleSignInEnabled?: boolean;
  resume?: SignUpResumeState;
}) {
  const [panel, setPanel] = useState<AuthPanel>(
    resume?.role === "student" ? "signUpTalent" : "signUpCompany",
  );

  return (
    <AuthSplitShell
      labels={labels}
      siteName={siteName}
      brandMark={brandMark}
      logoUrl={logoUrl}
      panel={panel}
    >
      <SignUpForm
        labels={labels}
        googleSignInEnabled={googleSignInEnabled}
        resume={resume}
        onRoleChange={(role: SignUpRole) =>
          setPanel(role === "company" ? "signUpCompany" : "signUpTalent")
        }
      />
    </AuthSplitShell>
  );
}
