import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(PORTAL_HOME[user.role]);
  }

  const labels = await getAuthLabels();

  return <SignUpForm labels={labels} />;
}
