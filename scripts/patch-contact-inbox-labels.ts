/**
 * Patch contact page + admin inbox labels and settings field labels.
 * Run: npx tsx scripts/patch-contact-inbox-labels.ts
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

  const adminNavLabels = {
    ...((existing.adminNavLabels as Record<string, string>) || {}),
    contact:
      ((existing.adminNavLabels as Record<string, string>) || {}).contact ||
      "Contact",
  };

  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown>) || {}),
  };

  adminPageLabels.contact = {
    ...((adminPageLabels.contact as Record<string, string>) || {}),
    eyebrow: "Inbox",
    title: "Contact messages",
    subtitle: "Respond to submissions from the public contact form.",
    empty: "No contact messages yet.",
    loading: "Loading…",
    from: "From",
    email: "Email",
    phone: "Phone",
    received: "Received",
    message: "Message",
    lastReply: "Last reply",
    replyTitle: "Reply by email",
    replySubject: "Subject",
    replyBody: "Message",
    replySubjectPrefix: "Re:",
    sendReply: "Send reply",
    sending: "Sending…",
    internalNotes: "Internal notes",
    saveNotes: "Save notes",
    saving: "Saving…",
    archive: "Archive",
    markNew: "Mark as new",
    statusNew: "New",
    statusRead: "Read",
    statusReplied: "Replied",
    statusArchived: "Archived",
    load_failed: "Could not load messages.",
    send_failed: "Could not send reply.",
    update_failed: "Could not save.",
    missing_email: "This submission has no email address.",
    not_configured: "Email delivery is not configured.",
    genericError: "Something went wrong.",
    contactPhone: "Contact phone",
    contactAddress: "Contact address",
  };

  adminPageLabels.settings = {
    ...((adminPageLabels.settings as Record<string, string>) || {}),
    contactPhone: "Contact phone",
    contactAddress: "Contact address",
    socialLinksHelp:
      ((adminPageLabels.settings as Record<string, string>) || {}).socialLinksHelp ||
      "These links show as icons in the site footer and on the contact page.",
  };

  const pageLabels = {
    ...((existing.pageLabels as Record<string, string>) || {}),
    contactEyebrow:
      ((existing.pageLabels as Record<string, string>) || {}).contactEyebrow ||
      "Contact",
    contactTitle:
      ((existing.pageLabels as Record<string, string>) || {}).contactTitle ||
      "Get in touch.",
    contactSubtitle:
      ((existing.pageLabels as Record<string, string>) || {}).contactSubtitle ||
      "Reach the Nextgenmove team by email, phone, or the form — we usually reply within one business day.",
    contactEmailLabel:
      ((existing.pageLabels as Record<string, string>) || {}).contactEmailLabel ||
      "Email",
    contactPhoneLabel:
      ((existing.pageLabels as Record<string, string>) || {}).contactPhoneLabel ||
      "Phone",
    contactAddressLabel:
      ((existing.pageLabels as Record<string, string>) || {}).contactAddressLabel ||
      "Address",
    contactSocialTitle:
      ((existing.pageLabels as Record<string, string>) || {}).contactSocialTitle ||
      "Social",
    contactFormTitle:
      ((existing.pageLabels as Record<string, string>) || {}).contactFormTitle ||
      "Send a message",
    contactMetaTitle:
      ((existing.pageLabels as Record<string, string>) || {}).contactMetaTitle ||
      "Contact",
    contactMetaDescription:
      ((existing.pageLabels as Record<string, string>) || {})
        .contactMetaDescription ||
      "Contact Nextgenmove by email, phone, or form.",
  };

  const formLabels = {
    ...((existing.formLabels as Record<string, string>) || {}),
    contactSuccessMessage:
      ((existing.formLabels as Record<string, string>) || {})
        .contactSuccessMessage ||
      "Thanks — your message is on its way. We'll reply soon.",
    contactFormName:
      ((existing.formLabels as Record<string, string>) || {}).contactFormName ||
      "Name",
    contactFormNamePlaceholder:
      ((existing.formLabels as Record<string, string>) || {})
        .contactFormNamePlaceholder || "Your name",
    contactFormEmail:
      ((existing.formLabels as Record<string, string>) || {}).contactFormEmail ||
      "Email",
    contactFormEmailPlaceholder:
      ((existing.formLabels as Record<string, string>) || {})
        .contactFormEmailPlaceholder || "you@example.com",
    contactFormPhone:
      ((existing.formLabels as Record<string, string>) || {}).contactFormPhone ||
      "Phone (optional)",
    contactFormPhonePlaceholder:
      ((existing.formLabels as Record<string, string>) || {})
        .contactFormPhonePlaceholder || "+971 …",
    contactFormSubject:
      ((existing.formLabels as Record<string, string>) || {}).contactFormSubject ||
      "Subject",
    contactFormSubjectPlaceholder:
      ((existing.formLabels as Record<string, string>) || {})
        .contactFormSubjectPlaceholder || "How can we help?",
    contactFormMessage:
      ((existing.formLabels as Record<string, string>) || {}).contactFormMessage ||
      "Message",
    contactFormMessagePlaceholder:
      ((existing.formLabels as Record<string, string>) || {})
        .contactFormMessagePlaceholder || "Tell us a bit more…",
    contactFormSubmit:
      ((existing.formLabels as Record<string, string>) || {}).contactFormSubmit ||
      "Send message",
    submitting:
      ((existing.formLabels as Record<string, string>) || {}).submitting ||
      "Sending…",
  };

  await ref.set(
    stripUndefined({
      adminNavLabels,
      adminPageLabels,
      pageLabels,
      formLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched contact form + admin inbox labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
