import { adminDb } from "@/lib/firebase-admin";
import type { AuthLabels } from "@/types/user";

/**
 * Operational auth copy used when Firestore authLabels are missing or blank.
 * Mirrors scripts/seed.ts authLabels so signup/sign-in stay readable during outages.
 */
export const FALLBACK_AUTH_LABELS: AuthLabels = {
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
  displayNameLabel: "Display name",
  roleLabel: "Account type",
  roleCompanyLabel: "I'm hiring",
  roleStudentLabel: "I'm looking for a role",
  signInSubmitLabel: "Sign in",
  signInSubmittingLabel: "Signing in…",
  signUpSubmitLabel: "Create account",
  signInPrompt: "Already have an account?",
  signInLinkShort: "Sign in",
  signUpPrompt: "Don't have an account?",
  signUpLinkShort: "Sign up",
  signInLinkLabel: "Already have an account? Sign in",
  signUpLinkLabel: "Need an account? Sign up",
  forgotPasswordLinkLabel: "Forgot password?",
  genericErrorLabel: "Something went wrong. Please try again.",
  sign_in_failed: "Sign in failed. Check your email and password.",
  unauthorized_domain:
    "This domain is not authorized for sign-in. Add www.nextgenmove.agency in Firebase Authentication → Settings → Authorized domains.",
  session_timeout: "Sign in timed out. Please try again.",
  service_unavailable:
    "Sign in is temporarily unavailable. Please try again in a moment.",
  session_failed: "Could not start your session. Please try again.",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  register_failed: "Registration failed. Please try again.",
  email_exists: "An account with that email already exists.",
  invalid_request: "Please check the form and try again.",
  consent_required: "Please accept the required terms to continue.",
  password_mismatch: "Passwords do not match.",
  email_verification_required:
    "Verify your email before signing in with 2FA enabled.",
  verification_required: "Verify your email and phone to continue.",
  email_otp_send_failed: "Could not send the email code. Try again.",
  sms_otp_send_failed: "Could not send the SMS code. Check the number and try again.",
  otp_invalid: "That code is incorrect. Try again.",
  otp_expired: "That code expired. Request a new one.",
  photo_required: "Upload a profile photo to finish.",
  logo_required: "Upload your company logo to finish.",
  upload_failed: "Upload failed. Try again.",
  complete_failed: "Could not finish signup. Try again.",
  stepAccount: "1 · Account",
  stepDetails: "2 · Profile details",
  stepVerify: "3 · Verify email & phone",
  stepMedia: "4 · Photo / logo",
  verifyTitle: "Verify your email and phone",
  verifySubtitle:
    "We sent a code to your email. Then confirm your phone with the Firebase SMS code.",
  verifyEmailHeading: "Email verification",
  verifyPhoneHeading: "Phone verification",
  emailOtpLabel: "Email code",
  smsOtpLabel: "SMS code",
  continueLabel: "Continue",
  backLabel: "Back",
  createAccountLabel: "Create account",
  finishLabel: "Finish & go to dashboard",
  consentRequiredLabel:
    "I agree to the Terms of Service and Privacy Policy",
  consentMarketingLabel: "Send me occasional product updates (optional).",
  fullNameLabel: "Full name",
  fullNamePlaceholder: "Your name",
  contactNameLabel: "Contact name",
  companyNameLabel: "Company name",
  phoneLabel: "Phone",
  nationalityLabel: "Nationality",
  workExperienceLabel: "Work experience",
  institutionLabel: "Institution",
  degreeLabel: "Degree",
  yearLabel: "Year",
  addEducationLabel: "Add education",
  educationSectionLabel: "Universities / education",
  sectorLabel: "Sector",
  seniorityLabel: "Seniority",
  currentCityLabel: "Current city",
  targetCitiesLabel: "Target cities (comma-separated)",
  bioLabel: "Short bio",
  skillsLabel: "Skills (comma-separated)",
  availabilityLabel: "Availability",
  linkedinLabel: "LinkedIn URL",
  portfolioLabel: "Portfolio URL",
  referralCodeLabel: "Referral code (optional)",
  educationLabel: "Universities / education",
  industryLabel: "Industry",
  websiteLabel: "Company website",
  preferredLocationsLabel: "Hiring locations (comma-separated)",
  hiringNeedsLabel: "What roles are you hiring for?",
  photoUploadLabel: "Profile photo (required)",
  cvUploadLabel: "CV (optional)",
  logoUploadLabel: "Company logo (required)",
};

function mergeAuthLabels(overlay: AuthLabels): AuthLabels {
  const merged: AuthLabels = { ...FALLBACK_AUTH_LABELS };
  for (const [key, value] of Object.entries(overlay)) {
    if (typeof value === "string" && value.trim()) {
      merged[key] = value;
    }
  }
  return merged;
}

export async function getAuthLabels(): Promise<AuthLabels> {
  try {
    const doc = await adminDb.collection("site_settings").doc("default").get();
    const authLabels = doc.data()?.authLabels;

    if (authLabels && typeof authLabels === "object") {
      return mergeAuthLabels(authLabels as AuthLabels);
    }
  } catch {
    // CMS labels are optional until seeded.
  }

  return { ...FALLBACK_AUTH_LABELS };
}
