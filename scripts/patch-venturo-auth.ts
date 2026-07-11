import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const ref = db.collection("site_settings").doc("default");
  const existing = (await ref.get()).data() || {};
  const authLabels = {
    ...((existing.authLabels as Record<string, string>) || {}),
    siteName: "Venturo",
    brandMark: "V",
    signInEyebrow: "Welcome back",
    signInTitle: "Sign in to your account.",
    signInSubtitle: "Pick up right where you left off.",
    signUpEyebrow: "Get started",
    signUpTitle: "Create your account.",
    signUpSubtitle: "Free to join. Your next step starts here.",
    emailLabel: "Email",
    emailPlaceholder: "you@email.com",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    roleCompanyLabel: "I'm hiring",
    roleStudentLabel: "I'm looking for a role",
    signInSubmitLabel: "Sign in",
    signUpSubmitLabel: "Create account",
    createAccountLabel: "Create account",
    continueWithGoogle: "Continue with Google",
    orDivider: "Or",
    signUpPrompt: "Don't have an account?",
    signUpLinkShort: "Sign up",
    signInPrompt: "Already have an account?",
    signInLinkShort: "Sign in",
    forgotPasswordLinkLabel: "Forgot password?",
    panelQuote:
      "Six weeks ago I was refreshing job boards in Amsterdam. Today I'm running brand for a scale-up in Dubai.",
    panelAttribution: "Sara K. · Marketing Lead · Placed via Venturo",
    panelQuoteCompany:
      "We moved from Track A to Track B once we needed three hires in a single quarter — sourcing alone cut our time-to-place in half.",
    panelAttributionCompany:
      "Nordbridge Logistics · Track B · 3 placements in Q2",
    statStudentsValue: "248",
    statStudentsLabel: "Active students",
    statPlacedValue: "41",
    statPlacedLabel: "Placed this Q",
    statTimeValue: "38d",
    statTimeLabel: "Avg. time to place",
    statCompaniesValue: "37",
    statCompaniesLabel: "Companies hiring",
    statMatchValue: "94%",
    statMatchLabel: "Top match score",
    statCorridorsValue: "6",
    statCorridorsLabel: "Live corridors",
    password_mismatch: "Passwords do not match.",
    google_coming_soon: "Google sign-in is coming soon.",
    consentRequiredLabel:
      "I agree to the Terms of Service and Privacy Policy",
    contactNameLabel: "Contact name",
    contactNamePlaceholder: "Your name",
    companyNameLabel: "Company name",
    companyNamePlaceholder: "Acme Corp",
    fullNamePlaceholder: "Your name",
    continueLabel: "Continue",
  };

  const navLabels = {
    ...((existing.navLabels as Record<string, string>) || {}),
    siteName: "Venturo",
  };

  await ref.set(
    stripUndefined({
      siteName: "Venturo",
      brandMark: "V",
      authLabels,
      navLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("Venturo branding + auth labels patched");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
