/** Operational email template shells — editable in Admin CMS after seed. */

function tpl(input: {
  id: string;
  name: string;
  description: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  preferenceKey: string | null;
  category: "security" | "account" | "billing" | "credits" | "product" | "ops";
}) {
  return { ...input, enabled: true };
}

export const EMAIL_TEMPLATES = [
  tpl({
    id: "account_created",
    name: "Account created",
    description: "Sent when a student or employer finishes registration.",
    subject: "Your {{siteName}} account is ready",
    preferenceKey: null,
    category: "account",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Your <strong>{{roleLabel}}</strong> account on {{siteName}} has been created successfully.</p>
<p style="margin:0 0 16px;">Next, verify your email and complete your profile so we can match you with the right opportunities.</p>
<p style="margin:0;"><a href="{{signInUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Sign in</a></p>`,
    textBody:
      "Hi {{displayName}},\n\nYour {{roleLabel}} account on {{siteName}} has been created.\nSign in: {{signInUrl}}\n",
  }),
  tpl({
    id: "welcome",
    name: "Welcome",
    description: "Warm welcome after profile media is completed.",
    subject: "Welcome aboard, {{displayName}}",
    preferenceKey: "product_updates",
    category: "account",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Welcome to {{siteName}}. {{tagline}}</p>
<p style="margin:0 0 16px;">Your profile is live. Open your dashboard to continue your journey.</p>
<p style="margin:0;"><a href="{{dashboardUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open dashboard</a></p>`,
    textBody:
      "Hi {{displayName}},\n\nWelcome to {{siteName}}.\nDashboard: {{dashboardUrl}}\n",
  }),
  tpl({
    id: "email_verification",
    name: "Email verification",
    description: "Verify email ownership.",
    subject: "Verify your email for {{siteName}}",
    preferenceKey: null,
    category: "security",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Please confirm this email belongs to you.</p>
<p style="margin:0 0 16px;"><a href="{{verifyUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Verify email</a></p>
<p style="margin:0;font-size:13px;color:#6b6478;">If you did not create an account, you can ignore this message.</p>`,
    textBody:
      "Hi {{displayName}},\n\nVerify your email: {{verifyUrl}}\n\nIf you did not create an account, ignore this message.\n",
  }),
  tpl({
    id: "account_login",
    name: "Account login",
    description: "Login notification for confidence and awareness.",
    subject: "New sign-in to your {{siteName}} account",
    preferenceKey: "login_alerts",
    category: "security",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">We noticed a new sign-in to your account.</p>
<ul style="margin:0 0 16px;padding-left:18px;">
  <li>When: {{when}}</li>
  <li>IP: {{ip}}</li>
  <li>Device: {{userAgent}}</li>
</ul>
<p style="margin:0;">If this was you, no action is needed. If not, reset your password immediately from the sign-in page.</p>`,
    textBody:
      "Hi {{displayName}},\n\nNew sign-in at {{when}}\nIP: {{ip}}\nDevice: {{userAgent}}\n\nIf this was not you, reset your password.\n",
  }),
  tpl({
    id: "suspicious_login",
    name: "Suspicious login attempt",
    description: "Different IP from previous login.",
    subject: "Unusual sign-in activity on {{siteName}}",
    preferenceKey: null,
    category: "security",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;"><strong>We detected a sign-in from a different location than usual.</strong></p>
<ul style="margin:0 0 16px;padding-left:18px;">
  <li>When: {{when}}</li>
  <li>New IP: {{ip}}</li>
  <li>Previous IP: {{previousIp}}</li>
  <li>Device: {{userAgent}}</li>
</ul>
<p style="margin:0 0 16px;">If this was you, you can ignore this email. If not, reset your password now and contact support.</p>
<p style="margin:0;"><a href="{{signInUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Secure my account</a></p>`,
    textBody:
      "Hi {{displayName}},\n\nUnusual sign-in at {{when}}\nNew IP: {{ip}}\nPrevious IP: {{previousIp}}\n\nIf this was not you, reset your password: {{signInUrl}}\n",
  }),
  tpl({
    id: "password_reset",
    name: "Forgot / reset password",
    description: "Password reset link.",
    subject: "Reset your {{siteName}} password",
    preferenceKey: null,
    category: "security",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">We received a request to reset your password.</p>
<p style="margin:0 0 16px;"><a href="{{resetUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Reset password</a></p>
<p style="margin:0;font-size:13px;color:#6b6478;">This link expires soon. If you did not request a reset, you can safely ignore this email.</p>`,
    textBody:
      "Hi {{displayName}},\n\nReset your password: {{resetUrl}}\n\nIf you did not request this, ignore this email.\n",
  }),
  tpl({
    id: "password_changed",
    name: "Password changed",
    description: "Confirmation after password change.",
    subject: "Your {{siteName}} password was changed",
    preferenceKey: null,
    category: "security",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Your password was changed successfully.</p>
<p style="margin:0;">If you did not make this change, reset your password immediately and contact support.</p>`,
    textBody:
      "Hi {{displayName}},\n\nYour password was changed. If this was not you, reset it immediately.\n",
  }),
  tpl({
    id: "welcome_credits",
    name: "Welcome credits",
    description: "Student welcome credit grant.",
    subject: "You received {{credits}} welcome credits",
    preferenceKey: "credit_receipts",
    category: "credits",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">We added <strong>{{credits}} credits</strong> to your account to get you started.</p>
<p style="margin:0;">Your balance is now <strong>{{balance}} credits</strong>.</p>`,
    textBody:
      "Hi {{displayName}},\n\nYou received {{credits}} welcome credits. Balance: {{balance}}.\n",
  }),
  tpl({
    id: "low_credit_balance",
    name: "Low credit balance",
    description: "Balance dropped below threshold.",
    subject: "Your credit balance is running low",
    preferenceKey: "low_balance",
    category: "credits",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Your balance is <strong>{{credits}} credits</strong> (below {{threshold}}).</p>
<p style="margin:0 0 16px;">Top up now so you do not miss coaching or store unlocks.</p>
<p style="margin:0;"><a href="{{topUpUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Top up credits</a></p>`,
    textBody:
      "Hi {{displayName}},\n\nBalance {{credits}} is below {{threshold}}. Top up: {{topUpUrl}}\n",
  }),
  tpl({
    id: "topup_requested",
    name: "Top-up requested",
    description: "Manual top-up pending admin confirmation.",
    subject: "We received your credit top-up request",
    preferenceKey: "credit_receipts",
    category: "credits",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Your request for <strong>{{packageLabel}}</strong> ({{credits}} credits · €{{priceEur}}) is being processed.</p>
<p style="margin:0;">We will email you as soon as the credits land.</p>`,
    textBody:
      "Hi {{displayName}},\n\nTop-up requested: {{packageLabel}} ({{credits}} credits, €{{priceEur}}).\n",
  }),
  tpl({
    id: "topup_successful",
    name: "Top-up successful",
    description: "Credits added after payment.",
    subject: "Top-up successful — {{credits}} credits added",
    preferenceKey: "credit_receipts",
    category: "credits",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Payment received for <strong>{{packageLabel}}</strong>.</p>
<p style="margin:0 0 16px;"><strong>{{credits}} credits</strong> were added. New balance: <strong>{{balance}}</strong>.</p>
<p style="margin:0;">Thank you for investing in your move.</p>`,
    textBody:
      "Hi {{displayName}},\n\n{{credits}} credits added ({{packageLabel}}). Balance: {{balance}}.\n",
  }),
  tpl({
    id: "referral_bonus",
    name: "Referral bonus",
    description: "Referrer earned credits.",
    subject: "You earned {{credits}} referral credits",
    preferenceKey: "referral",
    category: "credits",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Someone joined with your referral code. You earned <strong>{{credits}} credits</strong>.</p>
<p style="margin:0;">New balance: <strong>{{balance}}</strong>.</p>`,
    textBody:
      "Hi {{displayName}},\n\nReferral bonus: {{credits}} credits. Balance: {{balance}}.\n",
  }),
  tpl({
    id: "plan_request_received",
    name: "Plan request received",
    description: "Employer plan request acknowledgment.",
    subject: "We received your {{planLabel}} request",
    preferenceKey: "plan_approvals",
    category: "billing",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Thanks for requesting <strong>{{planLabel}}</strong>. Our team will confirm shortly.</p>
<p style="margin:0;">You will get another email when your plan is active.</p>`,
    textBody:
      "Hi {{displayName}},\n\nWe received your {{planLabel}} request and will confirm shortly.\n",
  }),
  tpl({
    id: "plan_activated",
    name: "Plan activated",
    description: "Employer subscription active.",
    subject: "Your {{planLabel}} plan is active",
    preferenceKey: "plan_approvals",
    category: "billing",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;"><strong>{{planLabel}}</strong> is now active on {{siteName}}.</p>
<p style="margin:0;">You can browse talent, manage pipeline, and update billing from your employer dashboard.</p>`,
    textBody:
      "Hi {{displayName}},\n\n{{planLabel}} is now active.\n",
  }),
  tpl({
    id: "payment_failed",
    name: "Payment failed",
    description: "Stripe invoice payment failed.",
    subject: "Action needed: payment failed for {{siteName}}",
    preferenceKey: null,
    category: "billing",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">We could not process your latest subscription payment.</p>
<p style="margin:0 0 16px;">Please update your payment method to keep access uninterrupted.</p>
<p style="margin:0;"><a href="{{billingUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Manage billing</a></p>`,
    textBody:
      "Hi {{displayName}},\n\nPayment failed. Update billing: {{billingUrl}}\n",
  }),
  tpl({
    id: "match_update",
    name: "Match update",
    description: "Student pipeline stage change.",
    subject: "Pipeline update: {{stageName}}",
    preferenceKey: "match_updates",
    category: "product",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Your match status moved to <strong>{{stageName}}</strong>.</p>
<p style="margin:0;"><a href="{{dashboardUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">View journey</a></p>`,
    textBody:
      "Hi {{displayName}},\n\nYour match moved to {{stageName}}. Dashboard: {{dashboardUrl}}\n",
  }),
  tpl({
    id: "form_submission_ack",
    name: "Form submission acknowledgment",
    description: "Public form / careers / request ack.",
    subject: "We received your {{formTitle}} submission",
    preferenceKey: null,
    category: "ops",
    htmlBody: `<p style="margin:0 0 16px;">Hi {{displayName}},</p>
<p style="margin:0 0 16px;">Thanks for submitting <strong>{{formTitle}}</strong>. Our team will follow up soon.</p>
<p style="margin:0;">— {{siteName}}</p>`,
    textBody:
      "Hi {{displayName}},\n\nWe received your {{formTitle}} submission. We will follow up soon.\n",
  }),
  tpl({
    id: "admin_pending_alert",
    name: "Admin pending alert",
    description: "Notify ops of pending requests.",
    subject: "Pending request on {{siteName}}",
    preferenceKey: "pending_requests",
    category: "ops",
    htmlBody: `<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 16px;">{{summary}}</p>
<p style="margin:0;"><a href="{{adminUrl}}" style="display:inline-block;background:#5b3d8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open admin</a></p>`,
    textBody: "{{summary}}\n\nAdmin: {{adminUrl}}\n",
  }),
] as const;
