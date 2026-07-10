import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(PORTAL_HOME[user.role]);
  }

  const labels = await getAuthLabels();

  return (
    <Suspense fallback={null}>
      <SignInForm labels={labels} />
    </Suspense>
  );
}
