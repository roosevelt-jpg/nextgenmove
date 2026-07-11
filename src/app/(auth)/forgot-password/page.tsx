import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAuthLabels } from "@/lib/auth/labels";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(PORTAL_HOME[user.role]);
  }

  const labels = await getAuthLabels();
  return <ForgotPasswordForm labels={labels} />;
}
