/**
 * Force-patch admin CMS labels + integrations shells into live Firestore.
 * Run: npx tsx scripts/patch-admin-labels.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID!,
        clientEmail:
          process.env.FIREBASE_ADMIN_CLIENT_EMAIL ??
          process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (
          process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
        )!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const existing = snap.data() ?? {};
  const formLabels = {
    ...((existing.formLabels as Record<string, string> | undefined) ?? {}),
  };
  delete formLabels.title;
  delete formLabels.subtitle;
  formLabels.newsletterTitle =
    formLabels.newsletterTitle || "Get the next dispatch";
  formLabels.newsletterSubtitle =
    formLabels.newsletterSubtitle || "One email a month. No noise.";

  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown> | undefined) ?? {}),
    integrations: {
      title: "Integrations",
      eyebrow: "Admin · Integrations",
      empty: "No integrations configured",
      connect: "Connect",
      disconnect: "Disconnect",
      connectTitle: "Connect integration",
      cancel: "Cancel",
      host: "Host",
      apiKey: "API key",
      statusConnected: "Connected",
      statusNotConnected: "Not connected",
      stripeHint:
        "Connect Stripe with live or test keys. Employer plans use monthly subscriptions with automatic card debit; student credit packs use one-time Checkout.",
      stripeSecretKey: "Secret key (sk_…)",
      stripePublishableKey: "Publishable key (pk_…)",
      stripeWebhookSecret: "Webhook signing secret (whsec_…)",
      stripeWebhookHelp:
        "In Stripe Dashboard → Developers → Webhooks, add endpoint: {APP_URL}/api/webhooks/stripe",
      stripeWebhookPath: "/api/webhooks/stripe",
      sendgridHint:
        "Connect SendGrid to send branded transactional email (signup, security, credits, billing).",
      sendgridApiKey: "API key (SG.…)",
      sendgridFromEmail: "From email (verified sender)",
      sendgridFromName: "From name",
      sendgridDefaultFromName: "Venturo",
      sendgridHelp:
        "Verify the from-address in SendGrid. Templates live in email_templates.",
    },
    users: {
      title: "Team & users",
      eyebrow: "Admin · Users",
      subtitle: "Every account on the platform — admins, employers, and students.",
      search: "Search",
      empty: "No users yet",
      email: "Email",
      name: "Name",
      role: "Role",
      status: "Status",
      actions: "Actions",
      promoteAdmin: "Make admin",
      suspend: "Suspend",
      activate: "Activate",
      viewProfile: "View",
      profileTitle: "User profile",
      openInCrm: "Open in CRM",
      profileLoadError: "Could not load profile.",
      noLinkedProfile: "No linked profile yet.",
      close: "Close",
      loading: "Loading…",
      phone: "Phone",
      fullName: "Full name",
      university: "University",
      currentCity: "City",
      sector: "Sector",
      seniority: "Seniority",
      availability: "Availability",
      skills: "Skills",
      companyName: "Company",
      contactName: "Contact",
      industry: "Industry",
      city: "City",
      website: "Website",
    },
    account: {
      ...((
        (existing.adminPageLabels as Record<string, unknown> | undefined)
          ?.account as Record<string, string> | undefined
      ) ?? {}),
      uploadPhoto: "Upload photo",
      photoDropzone: "JPG or PNG. Click or drop to upload.",
      uploadProgress: "Uploading…",
      uploadError: "Upload failed. Try a smaller JPG or PNG.",
      photoReady: "Photo ready — click Save changes.",
      photoSaved: "Photo saved.",
      storage_not_configured: "Storage is not configured.",
      upload_failed: "Upload failed. Try a smaller JPG or PNG.",
      removePhoto: "Remove",
    },
    settings: {
      settingsTitle: "Workspace settings.",
      workspaceEyebrow: "Admin · Settings",
      workspaceSubtitle: "General configuration for the Venturo workspace.",
      teamMembersTitle: "Team members",
      teamMembersBody: "Invite and manage admin users.",
      manageTeam: "Manage team →",
      securityTitle: "Security",
      require2fa: "Require two-factor authentication",
      require2faHelp: "Applies to all team members with admin access",
      sessionExpireDays: "Auto-expire sessions after N days",
      sessionExpireHelp: "Forces re-login on all devices (1–14 days)",
      securityEditHint:
        "Edit require2fa and sessionExpireDays in the workspace editor below.",
      billingTitle: "Billing",
      operatorPlanLabel: "Operator plan",
      operatorPlanDetail: "Unlimited students · billed monthly",
      manageBilling: "Manage billing",
      toggleOn: "On",
      toggleOff: "Off",
      editWorkspace: "Edit workspace fields",
      edit: "Edit",
    },
  };

  await ref.set(
    stripUndefined({
      formLabels,
      adminPageLabels,
      brandMark: existing.brandMark || "NG",
      siteName: existing.siteName || "Venturo",
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const integrations = [
    {
      id: "stripe",
      name: "Stripe",
      description:
        "Subscriptions with automatic monthly debit + one-time credit top-ups.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: {},
    },
    {
      id: "sendgrid",
      name: "SendGrid",
      description:
        "Branded transactional email for signup, security, and billing.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: {},
    },
    {
      id: "twilio",
      name: "Twilio",
      description: "SMS alerts for urgent notifications.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: {},
    },
  ];

  for (const item of integrations) {
    await db
      .collection("integrations")
      .doc(item.id)
      .set(stripUndefined(item), { merge: true });
  }

  console.log("Patched site_settings labels + integrations shells.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
