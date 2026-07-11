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
}: {
  labels: AuthLabels;
  siteName: string;
  brandMark: string;
}) {
  const [panel, setPanel] = useState<AuthPanel>("signUpCompany");

  return (
    <AuthSplitShell
      labels={labels}
      siteName={siteName}
      brandMark={brandMark}
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
