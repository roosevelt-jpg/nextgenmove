"use client";

import { useState } from "react";
import {
  AuthSplitShell,
  type AuthPanel,
} from "@/components/auth/auth-split-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import type { AuthLabels, SignUpRole } from "@/types/user";

export function SignUpPageClient({
  labels,
  siteName,
  brandMark,
  logoUrl,
}: {
  labels: AuthLabels;
  siteName: string;
  brandMark: string;
  logoUrl?: string | null;
}) {
  const [panel, setPanel] = useState<AuthPanel>("signUpCompany");

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
        onRoleChange={(role: SignUpRole) =>
          setPanel(role === "company" ? "signUpCompany" : "signUpTalent")
        }
      />
    </AuthSplitShell>
  );
}
