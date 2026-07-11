import { adminDb } from "@/lib/firebase-admin";
import { appBaseUrl } from "@/lib/billing/stripe";
import { queueTransactional } from "@/lib/email/send";
import type { UserRole } from "@/types/user";

async function userEmail(uid: string): Promise<{
  email: string;
  displayName: string;
  role: UserRole;
} | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const email = String(data.email ?? "");
  if (!email) return null;
  return {
    email,
    displayName: String(data.displayName ?? ""),
    role: data.role as UserRole,
  };
}

function base(request?: Request) {
  return appBaseUrl(request);
}

export async function notifyAccountCreated(options: {
  userId: string;
  role: UserRole;
  request?: Request;
}) {
  const user = await userEmail(options.userId);
  if (!user) return;

  queueTransactional({
    templateId: "account_created",
    to: user.email,
    userId: options.userId,
    role: options.role,
    vars: {
      displayName: user.displayName || user.email,
      roleLabel:
        options.role === "student"
          ? "Student"
          : options.role === "company"
            ? "Employer"
            : "Admin",
    },
    dedupeKey: `account_created:${options.userId}`,
    request: options.request,
  });
}

export async function notifyWelcome(options: {
  userId: string;
  role: UserRole;
  request?: Request;
}) {
  const user = await userEmail(options.userId);
  if (!user) return;
  const root = base(options.request);
  const dashboardUrl =
    options.role === "student"
      ? `${root}/student/dashboard`
      : options.role === "company"
        ? `${root}/employer/dashboard`
        : `${root}/admin/dashboard`;

  queueTransactional({
    templateId: "welcome",
    to: user.email,
    userId: options.userId,
    role: options.role,
    vars: {
      displayName: user.displayName || user.email,
      dashboardUrl,
    },
    dedupeKey: `welcome:${options.userId}`,
    request: options.request,
  });
}

export async function notifyEmailVerification(options: {
  userId: string;
  verifyUrl: string;
  request?: Request;
}) {
  const user = await userEmail(options.userId);
  if (!user) return;

  queueTransactional({
    templateId: "email_verification",
    to: user.email,
    userId: options.userId,
    role: user.role,
    vars: {
      displayName: user.displayName || user.email,
      verifyUrl: options.verifyUrl,
    },
    request: options.request,
  });
}

export async function notifyLoginAlert(options: {
  userId: string;
  ip: string;
  userAgent: string;
  when: string;
  request?: Request;
}) {
  const user = await userEmail(options.userId);
  if (!user) return;

  queueTransactional({
    templateId: "account_login",
    to: user.email,
    userId: options.userId,
    role: user.role,
    vars: {
      displayName: user.displayName || user.email,
      ip: options.ip,
      userAgent: options.userAgent.slice(0, 180),
      when: options.when,
    },
    request: options.request,
  });
}

export async function notifySuspiciousLogin(options: {
  userId: string;
  ip: string;
  previousIp: string;
  userAgent: string;
  when: string;
  request?: Request;
}) {
  const user = await userEmail(options.userId);
  if (!user) return;

  queueTransactional({
    templateId: "suspicious_login",
    to: user.email,
    userId: options.userId,
    role: user.role,
    vars: {
      displayName: user.displayName || user.email,
      ip: options.ip,
      previousIp: options.previousIp,
      userAgent: options.userAgent.slice(0, 180),
      when: options.when,
    },
    request: options.request,
  });
}

export async function notifyPasswordReset(options: {
  email: string;
  displayName?: string;
  resetUrl: string;
  request?: Request;
}) {
  queueTransactional({
    templateId: "password_reset",
    to: options.email,
    vars: {
      displayName: options.displayName || options.email,
      resetUrl: options.resetUrl,
    },
    request: options.request,
  });
}

export async function notifyPasswordChanged(options: {
  userId: string;
  request?: Request;
}) {
  const user = await userEmail(options.userId);
  if (!user) return;

  queueTransactional({
    templateId: "password_changed",
    to: user.email,
    userId: options.userId,
    role: user.role,
    vars: {
      displayName: user.displayName || user.email,
    },
    request: options.request,
  });
}

export async function notifyLowCreditBalance(options: {
  studentId: string;
  credits: number;
  threshold: number;
  request?: Request;
}) {
  const user = await userEmail(options.studentId);
  if (!user) return;
  const root = base(options.request);

  queueTransactional({
    templateId: "low_credit_balance",
    to: user.email,
    userId: options.studentId,
    role: "student",
    vars: {
      displayName: user.displayName || user.email,
      credits: options.credits,
      threshold: options.threshold,
      topUpUrl: `${root}/student/settings`,
    },
    dedupeKey: `low_credit:${options.studentId}:${Math.floor(Date.now() / 86400000)}`,
    request: options.request,
  });
}

export async function notifyTopUpRequested(options: {
  studentId: string;
  packageLabel: string;
  credits: number;
  priceEur: number;
  request?: Request;
}) {
  const user = await userEmail(options.studentId);
  if (!user) return;

  queueTransactional({
    templateId: "topup_requested",
    to: user.email,
    userId: options.studentId,
    role: "student",
    vars: {
      displayName: user.displayName || user.email,
      packageLabel: options.packageLabel,
      credits: options.credits,
      priceEur: options.priceEur,
    },
    request: options.request,
  });
}

export async function notifyTopUpSuccessful(options: {
  studentId: string;
  credits: number;
  balance: number;
  packageLabel?: string;
  request?: Request;
}) {
  const user = await userEmail(options.studentId);
  if (!user) return;

  queueTransactional({
    templateId: "topup_successful",
    to: user.email,
    userId: options.studentId,
    role: "student",
    vars: {
      displayName: user.displayName || user.email,
      credits: options.credits,
      balance: options.balance,
      packageLabel: options.packageLabel || "Credit pack",
    },
    request: options.request,
  });
}

export async function notifyWelcomeCredits(options: {
  studentId: string;
  credits: number;
  balance: number;
  request?: Request;
}) {
  const user = await userEmail(options.studentId);
  if (!user) return;

  queueTransactional({
    templateId: "welcome_credits",
    to: user.email,
    userId: options.studentId,
    role: "student",
    vars: {
      displayName: user.displayName || user.email,
      credits: options.credits,
      balance: options.balance,
    },
    dedupeKey: `welcome_credits:${options.studentId}`,
    request: options.request,
  });
}

export async function notifyReferralBonus(options: {
  referrerId: string;
  credits: number;
  balance: number;
  request?: Request;
}) {
  const user = await userEmail(options.referrerId);
  if (!user) return;

  queueTransactional({
    templateId: "referral_bonus",
    to: user.email,
    userId: options.referrerId,
    role: "student",
    vars: {
      displayName: user.displayName || user.email,
      credits: options.credits,
      balance: options.balance,
    },
    request: options.request,
  });
}

export async function notifyPlanRequestReceived(options: {
  companyId: string;
  planLabel: string;
  request?: Request;
}) {
  const user = await userEmail(options.companyId);
  if (!user) return;

  queueTransactional({
    templateId: "plan_request_received",
    to: user.email,
    userId: options.companyId,
    role: "company",
    vars: {
      displayName: user.displayName || user.email,
      planLabel: options.planLabel,
    },
    request: options.request,
  });
}

export async function notifyPlanActivated(options: {
  companyId: string;
  planLabel: string;
  request?: Request;
}) {
  const user = await userEmail(options.companyId);
  if (!user) return;

  queueTransactional({
    templateId: "plan_activated",
    to: user.email,
    userId: options.companyId,
    role: "company",
    vars: {
      displayName: user.displayName || user.email,
      planLabel: options.planLabel,
    },
    request: options.request,
  });
}

export async function notifyPaymentFailed(options: {
  companyId: string;
  request?: Request;
}) {
  const user = await userEmail(options.companyId);
  if (!user) return;
  const root = base(options.request);

  queueTransactional({
    templateId: "payment_failed",
    to: user.email,
    userId: options.companyId,
    role: "company",
    vars: {
      displayName: user.displayName || user.email,
      billingUrl: `${root}/employer/profile`,
    },
    request: options.request,
  });
}

export async function notifyMatchUpdate(options: {
  studentId: string;
  stageName: string;
  request?: Request;
}) {
  const user = await userEmail(options.studentId);
  if (!user) return;
  const root = base(options.request);

  queueTransactional({
    templateId: "match_update",
    to: user.email,
    userId: options.studentId,
    role: "student",
    vars: {
      displayName: user.displayName || user.email,
      stageName: options.stageName,
      dashboardUrl: `${root}/student/dashboard`,
    },
    request: options.request,
  });
}

export async function notifyFormSubmissionAck(options: {
  to: string;
  formTitle: string;
  displayName?: string;
  request?: Request;
}) {
  queueTransactional({
    templateId: "form_submission_ack",
    to: options.to,
    vars: {
      displayName: options.displayName || options.to,
      formTitle: options.formTitle,
    },
    request: options.request,
  });
}

export async function notifyAdminPending(options: {
  adminEmail: string;
  summary: string;
  request?: Request;
}) {
  const root = base(options.request);
  queueTransactional({
    templateId: "admin_pending_alert",
    to: options.adminEmail,
    role: "admin",
    vars: {
      summary: options.summary,
      adminUrl: `${root}/admin/dashboard`,
    },
    request: options.request,
  });
}
