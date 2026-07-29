import { adminDb } from "@/lib/firebase-admin";
import { getVerificationStatus } from "@/lib/auth/verification";
import { withTimeout } from "@/lib/async/with-timeout";
import type { UserRole } from "@/types/user";

export interface ProfileOnboardingState {
  profileComplete: boolean;
  role: UserRole | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  phone: string | null;
  email: string | null;
  nextStep: "verify" | "media" | "done";
}

export async function getProfileOnboardingState(
  uid: string,
): Promise<ProfileOnboardingState> {
  const snap = await withTimeout(
    adminDb.collection("users").doc(uid).get(),
    5000,
    "profile_onboarding_lookup",
  );
  const data = snap.data() ?? {};
  const roleRaw = String(data.role ?? "");
  const role: UserRole | null =
    roleRaw === "student" || roleRaw === "company" || roleRaw === "admin"
      ? roleRaw
      : null;
  const profileComplete = Boolean(data.profileComplete);

  if (profileComplete || role === "admin" || !role) {
    return {
      profileComplete,
      role,
      emailVerified: Boolean(data.emailVerified),
      phoneVerified: Boolean(data.phoneVerified),
      phone: data.phone ? String(data.phone) : null,
      email: data.email ? String(data.email) : null,
      nextStep: "done",
    };
  }

  const status = await getVerificationStatus(uid);
  const nextStep =
    !status.emailVerified || !status.phoneVerified ? "verify" : "media";

  return {
    profileComplete: false,
    role,
    emailVerified: status.emailVerified,
    phoneVerified: status.phoneVerified,
    phone: status.phone,
    email: status.email,
    nextStep,
  };
}
