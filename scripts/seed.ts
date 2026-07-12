/**
 * NextGen Move — operational config seed (Admin SDK only).
 *
 * Usage:
 *   npm run seed
 *
 * Requires .env.local with Firebase Admin credentials plus:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";
import { EMAIL_TEMPLATES } from "./email-templates";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
  )?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials in .env.local (FIREBASE_ADMIN_*).",
    );
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function opt(value: string, label?: string) {
  return { value, label: label ?? value };
}

function emptyStrings(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, ""]));
}

const NAV_LABEL_KEYS = [
  "siteName",
  "companySection",
  "talentSection",
  "employersSection",
  "about",
  "careers",
  "journal",
  "browseRoles",
  "howItWorks",
  "credits",
  "pricing",
  "tracks",
  "requestTalent",
  "forCompanies",
  "signIn",
  "headerCta",
  "headerCtaHref",
  "contact",
];

const EMPLOYER_NAV_KEYS = [
  "dashboard",
  "talentPool",
  "pipeline",
  "shortlist",
  "profile",
  "settings",
];
const STUDENT_NAV_KEYS = ["dashboard", "wallet", "store", "profile", "settings"];
const ADMIN_NAV_KEYS = [
  "dashboard",
  "levers",
  "crm",
  "library",
  "content",
  "settings",
  "account",
  "integrations",
  "users",
];

const TAXONOMIES = {
  sector: [
    opt("finance", "Finance & Banking"),
    opt("hospitality", "Hospitality & Tourism"),
    opt("technology", "Technology"),
    opt("engineering", "Engineering & Construction"),
    opt("healthcare", "Healthcare"),
    opt("retail", "Retail & Luxury"),
  ],
  department: [
    opt("engineering", "Engineering"),
    opt("coaching", "Coaching"),
    opt("ops", "Ops"),
    opt("sales", "Sales"),
  ],
  employmentType: [
    opt("full_time", "Full-time"),
    opt("contract", "Contract"),
    opt("remote", "Remote"),
  ],
  seniority: [
    opt("junior", "Junior"),
    opt("mid", "Mid"),
    opt("senior", "Senior"),
  ],
  timeline: [
    opt("asap", "ASAP"),
    opt("one_to_three_months", "1–3 months"),
    opt("just_exploring", "Just exploring"),
  ],
  category: [
    opt("relocation", "Relocation"),
    opt("career", "Career"),
    opt("credits", "Credits"),
    opt("skills", "Skills"),
  ],
  preferredTrack: [
    opt("track_a", "Track A"),
    opt("track_b", "Track B"),
    opt("not_sure", "Not sure yet"),
  ],
  articleTag: [] as { value: string; label: string }[],
};

const PIPELINE_STAGES = [
  {
    id: "pipeline_new_match",
    name: "New match",
    order: 1,
    color: "#4b3f9c",
    isTerminal: false,
  },
  {
    id: "pipeline_intro_sent",
    name: "Intro sent",
    order: 2,
    color: "#2e2768",
    isTerminal: false,
  },
  {
    id: "pipeline_interviewing",
    name: "Interviewing",
    order: 3,
    color: "#c97a2e",
    isTerminal: false,
  },
  {
    id: "pipeline_offer",
    name: "Offer",
    order: 4,
    color: "#2d6a4f",
    isTerminal: false,
  },
  {
    id: "pipeline_placed",
    name: "Placed",
    order: 5,
    color: "#8a8898",
    isTerminal: true,
  },
];

const PAGE_HOME = {
  eyebrowText: "Relocation. Engineered.",
  headline: "Your next step,",
  headlineEmphasis: "engineered.",
  subtext:
    "Venturo pairs you with a personal coach, a vetted employer, and a visa-ready path abroad — from first application to first day.",
  ctaPrimaryLabel: "Explore open roles",
  ctaPrimaryHref: "/careers-talent",
  ctaSecondaryLabel: "I'm hiring",
  ctaSecondaryHref: "/request-talent",
  hubLabel: "DXB",
  currentRoutesLabel: "Current routes",
  currentRoutesItems: [
    { code: "AMS" },
    { code: "BER" },
    { code: "CAI" },
    { code: "WAW" },
    { code: "PAR" },
    { code: "LIS" },
    { code: "DXB" },
  ],
  routesMarquee: {
    enabled: true,
    speedSec: 28,
    direction: "ltr",
    easing: "linear",
    pauseOnHover: true,
    separator: " · ",
  },
  globalReachEyebrow: "Global reach",
  globalReachHeadline: "Six corridors. One arrival city.",
  globalReachBody:
    "Every route on this map is live — a coach on one end, a vetted employer on the other, and a candidate somewhere mid-flight.",
  corridorChips: [
    { chip: "AMS → DXB" },
    { chip: "BER → DXB" },
    { chip: "CAI → DXB" },
    { chip: "WAW → DXB" },
    { chip: "PAR → DXB" },
    { chip: "LIS → DXB" },
  ],
  corridorChipsMarquee: {
    enabled: true,
    speedSec: 24,
    direction: "ltr",
    easing: "linear",
    pauseOnHover: true,
  },
  originCities: [
    {
      code: "AMS",
      label: "Amsterdam",
      initials: "AM",
      x: 80,
      y: 140,
      avatarX: 80,
      avatarY: 105,
    },
    {
      code: "BER",
      label: "Berlin",
      initials: "BE",
      x: 70,
      y: 250,
      avatarX: 55,
      avatarY: 250,
    },
    {
      code: "CAI",
      label: "Cairo",
      initials: "CA",
      x: 90,
      y: 360,
      avatarX: 78,
      avatarY: 398,
    },
    {
      code: "WAW",
      label: "Warsaw",
      initials: "WA",
      x: 420,
      y: 120,
      avatarX: 430,
      avatarY: 85,
    },
    {
      code: "PAR",
      label: "Paris",
      initials: "PA",
      x: 440,
      y: 260,
      avatarX: 465,
      avatarY: 260,
    },
    {
      code: "LIS",
      label: "Lisbon",
      initials: "LI",
      x: 410,
      y: 380,
      avatarX: 425,
      avatarY: 405,
    },
  ],
  boardingPass: {
    routeLabel: "AMS → DXB",
    passengerLabel: "Passenger",
    passengerValue: "You",
    coachLabel: "Coach",
    coachValue: "Assigned coach",
    statusLabel: "Status",
    statusValue: "Boarding",
    classLabel: "Class",
    classValue: "Track B",
    refLabel: "Ref",
    refValue: "VENTURO",
  },
  itineraryEyebrow: "The itinerary",
  itineraryHeadline: "Three legs. One arrival.",
  storiesEyebrow: "Stories",
  storiesHeadline: "Hear it from them.",
  storiesManagedLabel: "Managed in admin · Homepage content",
  podcastEyebrow: "The Move Podcast",
  podcastHeadline: "Conversations from the route.",
  podcastManagedLabel: "Managed in admin · Homepage content",
  testimonialQuote:
    "Six weeks ago I was refreshing job boards in Amsterdam. Today I'm running brand for a scale-up in Dubai — and my coach was in my corner for every leg of it.",
  testimonialAttribution: "Sara K. · Marketing lead · Placed via Venturo",
  testimonialBadge: "Placed {year}",
  talentCta: {
    eyebrow: "For talent",
    title: "Your seat is waiting.",
    body: "Free to join. Earn your first credits on welcome.",
    ctaLabel: "Get started",
    ctaHref: "/sign-up",
  },
  companyCta: {
    eyebrow: "For companies",
    title: "A pool, pre-flown.",
    body: "Every candidate is pre-screened and coached before you see them.",
    ctaLabel: "View plans",
    ctaHref: "/pricing",
  },
  rolesCta: {
    eyebrow: "Open seats",
    title: "Roles, ready now.",
    body: "Browse live openings across corridors — visa-ready paths included.",
    ctaLabel: "Browse roles",
    ctaHref: "/careers-talent",
  },
  statBlocks: [
    {
      label: "Active students",
      value: "0",
      metric: "active_students",
      suffix: "+",
    },
    {
      label: "Partner employers",
      value: "0",
      metric: "active_companies",
      suffix: "+",
    },
    {
      label: "Avg. time to place",
      value: "—",
      metric: "avg_time_to_place",
    },
    {
      label: "Placed this year",
      value: "0",
      metric: "placed_this_year",
      suffix: "+",
    },
  ],
  steps: [
    {
      legNumber: 1,
      phaseLabel: "LEG 01 · Check-in",
      title: "Build your profile",
      description:
        "Tell us your skills, sector, and where you want to land. Your coach verifies and sharpens it.",
    },
    {
      legNumber: 2,
      phaseLabel: "LEG 02 · Boarding",
      title: "Get matched & coached",
      description:
        "We introduce you to vetted employers, and coach you through every interview and offer.",
    },
    {
      legNumber: 3,
      phaseLabel: "LEG 03 · Arrival",
      title: "Placed & supported",
      description:
        "From signed offer to your first ninety days, your coach stays on the route with you.",
    },
  ],
};

const PAGE_ABOUT = {
  heroHeadline: "We engineer the move.",
  heroSubtext:
    "NextGen Move exists because relocating for a career should feel like a well-run itinerary, not a leap of faith. We pair every candidate with a coach and every employer with a pre-screened match.",
  missionBody:
    "<p>NextGen Move exists because relocating for a career should feel like a well-run itinerary, not a leap of faith. We pair every candidate with a coach and every employer with a pre-screened match.</p>",
  statBlocks: [
    { label: "Active students", value: "248" },
    { label: "Placed this quarter", value: "41" },
    { label: "Cities routed", value: "6" },
    { label: "Founded", value: "2019" },
  ],
  teamMembers: [
    {
      name: "Lemoni Grootkerk",
      role: "Founder & coach",
      photo: "",
      bio: "Leads coaching and placement strategy across every route.",
    },
    {
      name: "Amira Youssef",
      role: "Operations",
      photo: "",
      bio: "Keeps pipelines, visas, and first-ninety-day support on schedule.",
    },
    {
      name: "Piotr Nowak",
      role: "Employer success",
      photo: "",
      bio: "Partners with Track A and Track B employers on sourcing and fits.",
    },
  ],
  foundingStory: "",
};

const PAGE_HOW_IT_WORKS = {
  steps: [
    {
      legNumber: 1,
      phaseLabel: "Check-in",
      title: "Build your profile",
      description:
        "Tell us your skills, sector, and where you want to land. Your coach verifies and sharpens it.",
    },
    {
      legNumber: 2,
      phaseLabel: "Boarding",
      title: "Get matched & coached",
      description:
        "We introduce you to vetted employers, and coach you through every interview and offer.",
    },
    {
      legNumber: 3,
      phaseLabel: "Arrival",
      title: "Placed & supported",
      description:
        "From signed offer to your first ninety days, your coach stays on the route with you.",
    },
  ],
  faqItems: [
    {
      question: "How much does it cost to join?",
      answer:
        "Joining is free for talent. Every student starts with a 2,000 credit welcome bonus for coaching.",
    },
    {
      question: "How long does placement usually take?",
      answer: "38 days on average from profile complete to signed offer.",
    },
    {
      question: "Do you help with visas and relocation?",
      answer:
        "Yes — your coach supports visa paperwork and the first 90 days after you land.",
    },
  ],
};

const PAGE_PRICING = {
  trackAHeadline: "Self service",
  trackAFeatures: [
    "Full talent pool access",
    "Pipeline tracking",
    "Introduction via Lemoni",
  ],
  trackBHeadline: "Lemoni does everything",
  trackBFeatures: [
    "Lemoni searches for you",
    "Weekly updates",
    "Full placement support",
  ],
  faqItems: [
    {
      question: "Can we switch tracks later?",
      answer:
        "Yes — plan changes go through a quick approval from your account contact.",
    },
    {
      question: "Is there a contract?",
      answer: "No lock-in on either track. Cancel anytime from Our Profile.",
    },
  ],
  ctaLabel: "Request this plan",
};

const PAGE_TRACKS = {
  trackABody:
    "<p>Browse the talent pool yourself. You find the match. Lemoni handles the introduction.</p>",
  trackBBody:
    "<p>Full service. Lemoni actively sources your match and coaches the placement through to day ninety.</p>",
  statBlocks: [
    {
      label: "Active talent",
      value: "0",
      metric: "active_students",
      suffix: "+",
    },
    {
      label: "Hiring partners",
      value: "0",
      metric: "active_companies",
      suffix: "+",
    },
    {
      label: "Placed this year",
      value: "0",
      metric: "placed_this_year",
    },
    {
      label: "Avg. time to place",
      value: "—",
      metric: "avg_time_to_place",
      suffix: "d",
    },
  ],
  comparisonRows: [
    {
      feature: "Talent pool access",
      trackAValue: "Full",
      trackBValue: "Full",
    },
    {
      feature: "Sourcing",
      trackAValue: "Self-serve",
      trackBValue: "Lemoni-led",
    },
    {
      feature: "Coaching support",
      trackAValue: "Introductions",
      trackBValue: "End-to-end",
    },
  ],
  caseStudyQuote: null,
  ctaLabel: "Request talent",
  ctaHref: "/request-talent",
};

const DEFAULT_WAYS_TO_EARN = [
  {
    id: "welcome",
    action: "Welcome credit",
    credits: 2000,
    description: "On signup",
  },
  {
    id: "referral",
    action: "Referral bonus",
    credits: 150,
    description: "Per successful referral",
  },
  {
    id: "profile_complete",
    action: "Profile complete",
    credits: 100,
    description: "One-time",
  },
];

const AUTH_LABEL_KEYS = [
  "signInTitle",
  "signUpTitle",
  "emailLabel",
  "passwordLabel",
  "displayNameLabel",
  "roleLabel",
  "roleCompanyLabel",
  "roleStudentLabel",
  "signInSubmitLabel",
  "signUpSubmitLabel",
  "signInLinkLabel",
  "signUpLinkLabel",
  "genericErrorLabel",
  "sign_in_failed",
  "register_failed",
  "email_exists",
  "invalid_request",
  "consent_required",
  "photo_required",
  "logo_required",
  "upload_failed",
  "complete_failed",
  "stepAccount",
  "stepDetails",
  "stepMedia",
  "continueLabel",
  "backLabel",
  "createAccountLabel",
  "finishLabel",
  "consentRequiredLabel",
  "consentMarketingLabel",
  "fullNameLabel",
  "phoneLabel",
  "nationalityLabel",
  "workExperienceLabel",
  "educationLabel",
  "institutionLabel",
  "degreeLabel",
  "yearLabel",
  "addEducationLabel",
  "sectorLabel",
  "seniorityLabel",
  "currentCityLabel",
  "targetCitiesLabel",
  "bioLabel",
  "skillsLabel",
  "availabilityLabel",
  "linkedinLabel",
  "portfolioLabel",
  "referralCodeLabel",
  "companyNameLabel",
  "contactNameLabel",
  "industryLabel",
  "websiteLabel",
  "preferredLocationsLabel",
  "hiringNeedsLabel",
  "mediaIntro",
  "photoUploadLabel",
  "photoDropzone",
  "cvUploadLabel",
  "cvDropzone",
  "logoUploadLabel",
  "logoDropzone",
  "uploadProgress",
  "forgotPasswordTitle",
  "forgotPasswordIntro",
  "forgotPasswordSubmit",
  "forgotPasswordSent",
  "forgotPasswordLinkLabel",
];

function mergeEmptyFields(
  existing: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    const current = existing[key];

    if (
      current === undefined ||
      current === null ||
      current === "" ||
      (Array.isArray(current) && current.length === 0)
    ) {
      result[key] = defaultValue;
      continue;
    }

    if (
      typeof defaultValue === "object" &&
      defaultValue !== null &&
      !Array.isArray(defaultValue) &&
      typeof current === "object" &&
      current !== null &&
      !Array.isArray(current)
    ) {
      result[key] = mergeEmptyFields(
        current as Record<string, unknown>,
        defaultValue as Record<string, unknown>,
      );
    }
  }

  return result;
}

const OPERATIONAL_SITE_SETTINGS = {
  siteName: "Venturo",
  tagline: "Relocation, engineered.",
  siteDescription: "Your next step, engineered.",
  logoUrl: "",
  faviconUrl: "",
  defaultMetaTitle: "Venturo — Relocation, engineered.",
  defaultMetaDescription:
    "Venturo matches pre-screened talent with employers. Free to join for talent; curated hiring for companies.",
  brandMark: "V",
  contactEmail: "",
  footerCopyright: "© {year} {siteName}",
  footerAttributionPrefix: "Made with ❤️ by",
  footerAttributionName: "FLYN.AI",
  footerAttributionUrl: "https://myflynai.com/",
  timezone: "Europe/Amsterdam",
  defaultCurrency: "EUR",
  require2fa: false,
  sessionExpireDays: 5,
  operatorPlanLabel: "Operator plan",
  operatorPlanDetail: "Unlimited students · billed monthly",
  billingManageUrl: "",
  youtubePlaylistUrl: "",
  youtubeSyncEnabled: true,
  youtubeHomepageLimit: 3,
  youtubeLibraryLimit: 12,
  youtubeLastSyncedAt: null as string | null,
  youtubeLastSyncError: null as string | null,
  socialLinks: [] as Array<{ key: string; label: string; url: string }>,
  navLabels: {
    siteName: "Venturo",
    companySection: "Company",
    talentSection: "Talent",
    employersSection: "Employers",
    about: "About",
    careers: "Careers",
    journal: "Journal",
    browseRoles: "Browse roles",
    howItWorks: "How it works",
    credits: "Credits",
    pricing: "Pricing",
    tracks: "Tracks",
    requestTalent: "Request talent",
    forCompanies: "For companies",
    signIn: "Log in",
    headerCta: "Start your journey",
    headerCtaHref: "/sign-up",
    contact: "Contact",
  },
  authLabels: {
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
    displayNameLabel: "Display name",
    roleLabel: "Account type",
    roleCompanyLabel: "I'm hiring",
    roleStudentLabel: "I'm looking for a role",
    signInSubmitLabel: "Sign in",
    signInSubmittingLabel: "Signing in…",
    signUpSubmitLabel: "Create account",
    continueWithGoogle: "Continue with Google",
    orDivider: "Or",
    signUpPrompt: "Don't have an account?",
    signUpLinkShort: "Sign up",
    signInPrompt: "Already have an account?",
    signInLinkShort: "Sign in",
    signInLinkLabel: "Already have an account? Sign in",
    signUpLinkLabel: "Need an account? Sign up",
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
    genericErrorLabel: "Something went wrong. Please try again.",
    sign_in_failed: "Sign in failed. Check your email and password.",
    session_timeout: "Sign in timed out. Please try again.",
    service_unavailable:
      "Sign in is temporarily unavailable. Please try again in a moment.",
    session_failed: "Could not start your session. Please try again.",
    rate_limited: "Too many attempts. Please wait a minute and try again.",
    load_failed: "Could not load data — showing defaults where possible.",
    load_degraded: "Live data is temporarily unavailable — showing defaults.",
    register_failed: "Registration failed. Please try again.",
    email_exists: "An account with that email already exists.",
    invalid_request: "Please check the form and try again.",
    consent_required: "Please accept the required terms to continue.",
    password_mismatch: "Passwords do not match.",
    google_coming_soon: "Google sign-in is coming soon.",
    photo_required: "Upload a profile photo to finish.",
    logo_required: "Upload your company logo to finish.",
    upload_failed: "Upload failed. Try again.",
    complete_failed: "Could not finish signup. Try again.",
    verification_required: "Verify your email and phone to continue.",
    otp_invalid: "That code is incorrect. Try again.",
    otp_expired: "That code expired. Request a new one.",
    otp_locked: "Too many attempts. Request a new code.",
    otp_not_found: "Request a new verification code first.",
    email_otp_send_failed: "Could not send the email code. Try again.",
    sms_otp_send_failed: "Could not send the SMS code. Check the number and try again.",
    sms_not_sent: "Send an SMS code first.",
    phone_verify_failed: "Could not verify that phone number.",
    phone_not_linked: "Complete the SMS verification first.",
    not_configured: "Email delivery is not configured yet.",
    stepAccount: "1 · Account",
    stepDetails: "2 · Profile details",
    stepVerify: "3 · Verify email & phone",
    stepMedia: "4 · Photo / logo",
    verifyTitle: "Verify your email and phone",
    verifySubtitle:
      "We sent a code to your email. Then confirm your phone with the Firebase SMS code.",
    verifyEmailHeading: "Email verification",
    verifyPhoneHeading: "Phone verification",
    verifyPhoneHint: "Use international format (e.g. +9715…).",
    emailOtpLabel: "Email code",
    smsOtpLabel: "SMS code",
    resendEmailOtpLabel: "Resend email code",
    sendSmsOtpLabel: "Send SMS code",
    resendSmsOtpLabel: "Resend SMS",
    verifyEmailButton: "Verify email",
    verifyPhoneButton: "Verify phone",
    continueAfterVerifyLabel: "Continue to profile media",
    verifiedLabel: "Verified",
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
    contactNamePlaceholder: "Your name",
    companyNameLabel: "Company name",
    companyNamePlaceholder: "Acme Corp",
    phoneLabel: "Phone",
    nationalityLabel: "Nationality",
    workExperienceLabel: "Work experience",
    educationLabel: "Universities / education",
    institutionLabel: "Institution",
    degreeLabel: "Degree",
    yearLabel: "Year",
    addEducationLabel: "Add education",
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
    industryLabel: "Industry",
    websiteLabel: "Company website",
    preferredLocationsLabel: "Hiring locations (comma-separated)",
    hiringNeedsLabel: "What roles are you hiring for?",
    mediaIntro:
      "Almost done — add a face to your profile (students) or your company logo (employers). This stays linked to your account.",
    photoUploadLabel: "Profile photo (required)",
    photoDropzone: "JPG or PNG. Square works best.",
    cvUploadLabel: "CV (optional)",
    cvDropzone: "Upload PDF",
    logoUploadLabel: "Company logo (required)",
    logoDropzone: "JPG, PNG, or SVG",
    uploadProgress: "Uploading…",
    forgotPasswordTitle: "Reset password",
    forgotPasswordIntro:
      "Enter your email and we will send a secure reset link if an account exists.",
    forgotPasswordSubmit: "Send reset link",
    forgotPasswordSent:
      "If an account exists for that email, a reset link is on its way.",
  },
  formLabels: {
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    create: "Create",
    delete: "Delete",
    search: "Search",
    empty: "Nothing here yet",
    loading: "Loading…",
    submit: "Submit request",
    newsletterSubmit: "Subscribe",
    subscribe: "Subscribe",
    successMessage: "Request received. We'll be in touch shortly.",
    formSuccess: "Thanks — we received your submission.",
    missing_required: "Please fill in all required fields.",
    submit_failed: "Could not submit. Please try again.",
    watchVideo: "Watch",
    hideVideo: "Hide video",
    openLink: "Open link",
    openContent: "Open",
    priceEurSuffix: " · €{amount}",
    plan: "Plan",
    subscriptionStatus: "Subscription status",
    youtubePlaylistUrl: "YouTube playlist URL",
    youtubeSyncEnabled: "YouTube sync enabled",
    youtubeHomepageLimit: "Homepage video limit",
    youtubeLibraryLimit: "Portal video library limit",
    youtubeLastSyncedAt: "Last YouTube sync",
    youtubeLastSyncError: "Last YouTube sync error",
    generalApplication: "General application",
    applyHere: "Apply",
    companyName: "Company name",
    companyNamePlaceholder: "Acme Corp",
    contactName: "Contact name",
    contactNamePlaceholder: "Your name",
    workEmail: "Work email",
    workEmailPlaceholder: "you@company.com",
    phone: "Phone (optional)",
    phonePlaceholder: "+31 …",
    roleTitleNeeded: "Role title needed",
    roleTitlePlaceholder: "e.g. Financial analyst",
    sector: "Sector",
    sectorPlaceholder: "Select sector",
    location: "Location",
    locationPlaceholder: "Dubai",
    numberOfHires: "Number of hires",
    preferredTrack: "Preferred track",
    timeline: "Timeline",
    timelinePlaceholder: "Select timeline",
    additionalRequirements: "Additional requirements",
    additionalRequirementsPlaceholder: "Anything else Lemoni should know…",
    jobDescriptionUpload: "Job description (optional)",
    jobDescriptionDropzone: "Upload PDF or DOCX",
    uploadProgress: "Uploading…",
    genericError: "Something went wrong. Please try again.",
    newsletterTitle: "Get the next dispatch",
    newsletterSubtitle: "One email a month. No noise.",
    email: "Email",
    emailPlaceholder: "you@email.com",
    searchPlaceholder: "Search by title or keyword",
    all: "All",
    allSectors: "All sectors",
    allLocations: "All locations",
    filterSector: "Sector",
    filterLocation: "Location",
    relocationBadge: "Relocation supported",
    applyLabel: "Apply",
    viewRole: "View role",
    filterByDepartment: "Department",
    allDepartments: "All departments",
  },
  pageLabels: {
    pricingTitle: "Pricing",
    pricingEyebrow: "Pricing",
    pricingHeadline: "Two tracks. Pick your altitude.",
    pricingIntro: "",
    trackAMonthlyLabel: "€{amount}/mo",
    trackAMatchFeeLabel: "+ €{amount} per match, one-time",
    trackBMonthlyLabel: "€{amount}/mo",
    trackBSubprice: "per placed student, monthly",
    trackACtaLabel: "Start Track A",
    trackBCtaLabel: "Start Track B",
    creditsTitle: "Credits",
    creditsEyebrow: "Credits",
    creditsHeadline: "Coaching, paid in credits.",
    creditsIntro: "",
    creditsContentTitle: "Spend on",
    creditsWaysToEarnTitle: "Ways to earn",
    creditsCostLabel: "{credits} cr",
    creditsEarnLabel: "{credits} cr",
    howItWorksTitle: "How it works",
    howItWorksEyebrow: "How it works",
    howItWorksHeadline: "Three legs. One arrival.",
    howItWorksIntro: "",
    howItWorksCtaLabel: "Start your journey",
    howItWorksCtaHref: "/sign-up",
    howItWorksCtaBody: "Free to join. Earn your first 2,000 credits on welcome.",
    aboutEyebrow: "About",
    contactEyebrow: "Contact",
    contactTitle: "Get in touch.",
    contactSubtitle: "Reach the Venturo team by email or on social.",
    contactEmailLabel: "Email",
    contactSocialTitle: "Social",
    contactMetaTitle: "Contact",
    contactMetaDescription: "Contact Venturo by email or social media.",
    requestTalentEyebrow: "Request talent",
    requestTalentHeadline: "Tell us who you need.",
    browseRolesEyebrow: "Browse roles",
    browseRolesHeadline: "Open seats, right now.",
    journalEyebrow: "Journal",
    journalHeadline: "Notes from the route.",
    careersEyebrow: "Careers",
    careersHeadline: "Help build the route.",
    missionTitle: "Mission",
    teamTitle: "Team",
    foundingStoryTitle: "Founding story",
    faqTitle: "Questions",
    trackATitle: "Track A",
    trackBTitle: "Track B",
    tracksEyebrow: "Track A / Track B",
    tracksHeadline: "Which track fits how you hire?",
    tracksIntro: "A side-by-side of what each track actually does for your team.",
    tracksCtaLabel: "Request talent",
    tracksCtaBody: "Tell us who you need — we’ll match the right track.",
    comparisonTitle: "Compare tracks",
    comparisonFeatureColumn: "Feature",
    comparisonTrackAColumn: "Track A · Self service",
    comparisonTrackBColumn: "Track B · Full service",
    caseStudyEyebrow: "Result",
    careersApplyEyebrow: "Apply",
    cmsPageEyebrow: "Page",
    cmsFormEyebrow: "Form",
  },
  employerNavLabels: {
    dashboard: "Dashboard",
    talentPool: "Talent pool",
    pipeline: "Pipeline",
    shortlist: "Shortlist",
    profile: "Profile",
    settings: "Settings",
  },
  employerPageLabels: {
    dashboard: {
      title: "Employer dashboard",
      planTrackA: "Track A",
      planTrackB: "Track B",
      planNone: "No plan yet",
      subscription_active: "Active",
      subscription_pending: "Pending",
      subscription_inactive: "Inactive",
      statTalentPool: "Talent pool",
      statShortlisted: "Shortlisted",
      statPipeline: "In pipeline",
      openTalentPool: "Open talent pool →",
      openPipeline: "Open pipeline →",
      openProfile: "Manage plan & profile →",
      videosTitle: "Private video materials",
      videosSubtitle: "Exclusive route briefings for active Track A and Track B subscribers.",
      videosLocked:
        "Private video materials unlock with an active Track A or Track B subscription.",
      videosUpgradeCta: "Activate your plan from Profile to watch.",
      videosEmpty: "No videos in the library yet.",
      videosWatch: "Watch on YouTube",
    },
    talentPool: {
      statCandidates: "Available",
      statShortlisted: "Shortlisted",
      statInterviewing: "Interviewing",
      filterSector: "Sector",
      filterSeniority: "Seniority",
      filterLocation: "Location",
      searchLabel: "Search",
      searchPlaceholder: "Search by name, skill, or location",
      all: "All",
      clearFilters: "Clear filters",
      viewProfile: "View profile",
      shortlistAction: "Shortlist",
      unshortlistAction: "Remove star",
      shortlistedLabel: "Shortlisted",
      emptyState: "No candidates in your pool yet. Ask Lemoni to curate matches.",
      backToPool: "← Talent pool",
      matchScoreLabel: "match",
      bioLabel: "Bio",
      skillsLabel: "Skills",
      availabilityLabel: "Availability",
      targetCitiesLabel: "Target cities",
      emailLabel: "Email",
      linkedinLabel: "LinkedIn",
      portfolioLabel: "Portfolio",
      cvLabel: "CV",
      notFound: "Candidate not found",
      browseTitle: "Browse the full pool",
      browseIntro: "Track A self-serve — open a profile to add them to your pipeline.",
      browseOpenAction: "Open profile",
      browseEmpty: "No unmatched candidates right now.",
    },
    shortlist: {
      emptyState: "Star candidates from the talent pool to build your shortlist.",
      search: "Search",
      searchPlaceholder: "Name, email, sector, city…",
      clearFilters: "Clear filters",
      notesTitle: "Notes",
      noteLabel: "Add a note",
      notePlaceholder: "Interview feedback, next steps…",
      addNote: "Save note",
      selectCandidate: "Select a candidate to view notes.",
      reorderHint: "Drag or use arrows to rank your shortlist.",
      moveUp: "Move up",
      moveDown: "Move down",
      viewProfile: "View",
    },
    pipeline: {
      eyebrow: "Pipeline",
      title: "Your hiring in motion.",
      search: "Search",
      searchPlaceholder: "Name, email, sector, city…",
      filterStage: "Stage",
      filterSector: "Sector",
      filterShortlisted: "Shortlist",
      filterAll: "All",
      clearFilters: "Clear filters",
      shortlistedYes: "Shortlisted",
      shortlistedNo: "Not shortlisted",
      statViewed: "Viewed",
      statShortlisted: "Shortlisted",
      statInterviews: "Interviews planned",
      statPlaced: "Placed",
      funnelTitle: "Hiring funnel, this quarter",
      funnelLegend: "Candidates at each stage",
      funnelViewed: "Viewed",
      funnelShortlisted: "Shortlisted",
      funnelInterviewing: "Interviewing",
      funnelPlaced: "Placed",
      emptyBoard: "No candidates in the pipeline yet.",
      moveError: "Could not move candidate.",
    },
    profile: {
      choosePlanTitle: "Choose a plan",
      currentPlanBadge: "Current",
      currentPriceLabel: "€{amount}/mo",
      trackAMonthlyLabel: "€{amount}/mo",
      trackAMatchFeeLabel: "+ €{amount} per match, one-time",
      trackBMonthlyLabel: "€{amount}/mo",
      requestTrackA: "Subscribe · Track A",
      requestTrackB: "Subscribe · Track B",
      manageBilling: "Manage billing",
      planRequestSuccess: "Plan request sent — pending approval.",
      planRequestError: "Could not start checkout. Try again.",
      subscription_active: "Active",
      subscription_pending: "Pending",
      subscription_inactive: "Inactive",
      requirementsTitle: "Requirements",
      requirementsEmpty: "No requirements uploaded yet.",
      requirementTitle: "Requirement title",
      requirementUpload: "Upload file",
      requirementDropzone: "PDF or DOCX",
      uploadProgress: "Uploading…",
    },
    account: {
      accountEyebrow: "My profile",
      accountTitle: "Account & profile.",
      accountSubtitle: "This is what you see, not what candidates see.",
      uploadPhoto: "Upload photo",
      removePhoto: "Remove",
      photoDropzone: "JPG or PNG. Square works best.",
      personalDetailsTitle: "Personal details",
      fullName: "Full name",
      roleLabel: "Role",
      roleCompany: "Company",
      email: "Email",
      phone: "Phone",
      passwordTitle: "Password",
      currentPassword: "Current password",
      newPassword: "New password",
      notificationsTitle: "Notifications",
      notification_match_updates: "Match updates",
      notification_plan_approvals: "Plan approvals",
      saveChanges: "Save changes",
      saveSuccess: "Saved.",
      saveError: "Could not save.",
      uploadProgress: "Uploading…",
    },
  },
  employerNotificationKeys: [
    "match_updates",
    "plan_approvals",
    "login_alerts",
    "product_updates",
  ],
  studentNavLabels: {
    dashboard: "Dashboard",
    wallet: "Wallet",
    store: "Content store",
    profile: "Profile",
    settings: "Settings",
  },
  studentPageLabels: {
    dashboard: {
      creditsLabel: "Credits",
      profileCompletenessLabel: "Profile",
      profileCompletenessValue: "{percent}%",
      matchesLabel: "Matches",
      pipelineTitle: "Your journey",
      shortlistedBadge: "Shortlisted",
      recommendedTitle: "Recommended for you",
      costCreditsLabel: "{credits} cr",
      unlockedLabel: "Unlocked",
      viewInStore: "View in store",
      walletEyebrow: "Wallet",
      walletTitle: "Your credits",
      walletSubtitle: "Balance, top-ups, and every credit movement in one place.",
      topUpButton: "Top up",
      topUpTitle: "Buy credits",
      topUpIntro:
        "Buy a credit pack. When Stripe is connected you pay by card; otherwise we confirm payment manually.",
      topUpAction: "Buy",
      topUpBuying: "Starting…",
      topUpRequested: "Request sent — pending admin approval.",
      topUpFailed: "Could not start top-up. Try again.",
      topUpSuccess: "Top-up successful. Balance updated.",
      topUpCancelled: "Top-up cancelled.",
      topUpNoPackages: "No packages available",
      transactionHistoryTitle: "Transaction history",
      transactionsEmpty: "No transactions yet",
      viewAllTransactions: "View all",
      walletStripeHint: "Card checkout available for top-ups.",
      walletManualHint:
        "Top-ups are requested for admin approval until Stripe is connected.",
      tx_stripe_topup: "Card top-up",
      tx_manual_topup: "Top-up (approved)",
      tx_redeem: "Content unlock",
      tx_referral: "Referral bonus",
      tx_welcome: "Welcome credits",
      tx_profile_complete: "Profile complete bonus",
      tx_other: "Adjustment",
      close: "Close",
      loading: "Loading…",
      videosTitle: "Private video materials",
      videosSubtitle: "Exclusive route briefings for active Track A and Track B members.",
      videosLocked:
        "Private video materials unlock with an active Track A or Track B subscription.",
      videosUpgradeCta: "Ask your coach or admin to activate your paid track.",
      videosEmpty: "No videos in the library yet.",
      videosWatch: "Watch on YouTube",
    },
    wallet: {
      walletEyebrow: "Wallet",
      walletPageTitle: "Credits & history",
      walletPageSubtitle:
        "Your full ledger — top up anytime and track every earn and spend.",
      walletTitle: "Your credits",
      topUpButton: "Top up",
      transactionHistoryTitle: "All transactions",
    },
    settings: {
      accountTitle: "Account",
      emailLabel: "Email",
      referralTitle: "Refer a friend",
      referralIntro: "Share your code. You earn {credits} credits when they join.",
      copyCode: "Copy code",
      applyReferralLabel: "Have a code?",
      applyReferralPlaceholder: "Enter referral code",
      applyReferralAction: "Apply",
      referralApplied: "Referral applied.",
      alreadyReferred: "You already used a referral code.",
      topUpTitle: "Buy credits",
      topUpIntro:
        "Buy a credit pack. When Stripe is connected you pay by card at Checkout; otherwise Lemoni confirms payment manually.",
      topUpAction: "Buy / request",
      topUpRequested: "Request sent — pending admin approval.",
      topUpFailed: "Could not start top-up. Try again.",
      invalid_code: "That code is not valid.",
      already_referred: "You already used a referral code.",
      self_referral: "You cannot use your own code.",
    },
    account: {
      accountEyebrow: "My profile",
      accountTitle: "Account & profile.",
      accountSubtitle: "This is what you see, not what companies see.",
      uploadPhoto: "Upload photo",
      removePhoto: "Remove",
      photoDropzone: "JPG or PNG. Square works best.",
      personalDetailsTitle: "Personal details",
      fullName: "Full name",
      roleLabel: "Role",
      roleStudent: "Student",
      email: "Email",
      phone: "Phone",
      passwordTitle: "Password",
      currentPassword: "Current password",
      newPassword: "New password",
      notificationsTitle: "Notifications",
      notification_match_updates: "Match & pipeline updates",
      notification_credit_receipts: "Credit receipts",
      notification_low_balance: "Low credit balance alerts",
      notification_referral: "Referral bonuses",
      notification_login_alerts: "Login alerts",
      notification_product_updates: "Product updates",
      saveChanges: "Save changes",
      saveSuccess: "Saved.",
      saveError: "Could not save.",
      uploadProgress: "Uploading…",
    },
    store: {
      creditsBalance: "You have {credits} credits",
      search: "Search",
      searchPlaceholder: "Title or description",
      filterCategory: "Category",
      filterType: "Type",
      filterAccess: "Access",
      filterAll: "All",
      allCategories: "All categories",
      clearFilters: "Clear filters",
      accessPurchased: "Unlocked",
      accessLocked: "Locked",
      costCreditsLabel: "{credits} cr",
      unlockedLabel: "Unlocked",
      purchaseAction: "Unlock",
      openContent: "Open",
      openLink: "Open link",
      watchVideo: "Watch",
      hideVideo: "Hide",
      genericError: "Something went wrong.",
      insufficient_credits: "Not enough credits.",
    },
  },
  studentNotificationKeys: [
    "match_updates",
    "credit_receipts",
    "low_balance",
    "referral",
    "login_alerts",
    "product_updates",
  ],
  adminNavLabels: {
    dashboard: "Dashboard",
    levers: "Program Levers",
    crm: "CRM",
    library: "Content Library",
    content: "Homepage Content",
    settings: "Settings",
    account: "My account",
    integrations: "Integrations",
    users: "Users",
  },
  adminNotificationKeys: ["pending_requests", "weekly_digest", "sms_alerts"],
  adminPageLabels: {
    dashboard: {
      eyebrow: "Admin",
      title: "Operations dashboard.",
      subtitle:
        "Real-time overview of NextGen Move placements and activity.",
      activeCompanies: "Active companies",
      activeStudents: "Active students",
      placedThisQuarter: "Placed this Q",
      avgTimeToPlaceDays: "Avg time-to-place",
      daysSuffix: "d",
      openPipelineMatches: "Open matches",
      pendingRequestsCount: "Open requests",
      liveContentItems: "Live content",
      contentLibraryTitle: "Content library",
      contentLibraryLink: "Manage catalog →",
      uploadMaterial: "+ Upload material",
      contentEmpty: "No content items yet.",
      contentLivePill: "Live",
      chartPlacementsTitle: "Placements & active students, last 6 months",
      chartActiveStudents: "Active students",
      chartPlaced: "Placed",
      chartTracksTitle: "Track A vs Track B",
      chartCompanies: "Companies",
      trackALabel: "Track A",
      trackBLabel: "Track B",
      status_draft: "Draft",
      status_live: "Live",
      status_archived: "Archived",
      pendingTitle: "Pending requests",
      activityTitle: "Recent activity",
      pendingEmpty: "No pending requests",
      activityEmpty: "No activity yet",
      refresh: "Refresh",
      approve: "Approve",
      reject: "Reject",
      promote: "Promote",
      sourceAll: "All",
      sourceRequests: "Requests",
      sourceApplications: "Applications",
      sourceInterest: "Role interest",
    },
    shell: {
      workspaceSection: "Workspace",
      workspaceStudent: "Student",
      workspaceEmployer: "Employer",
      workspaceAdmin: "Admin",
      adminSection: "Admin",
      globalSettings: "My account",
      myAccount: "My account",
      publicSite: "Public site",
      signOut: "Sign out",
      workspacePreviewBanner:
        "Admin preview — read-only shell. Open CRM for live student and employer records.",
      workspaceImpersonationBanner: "Viewing as {name}.",
      openCrm: "Open CRM",
      exitImpersonation: "Exit view-as",
      viewAsUser: "View as user",
      previewReadonly: "Preview is read-only.",
    },
    crm: {
      eyebrow: "CRM",
      title: "All relationships, one place.",
      subtitle:
        "Every company, candidate, and inbound lead — tracked from first touch to placement.",
      contactsTab: "All contacts",
      companiesTab: "Companies",
      studentsTab: "Interns",
      importContacts: "Import CSV / Excel",
      importTitle: "Import contacts",
      importHelp:
        "Upload a CSV or Excel (.xlsx) file. Matching emails update existing Students or Companies; new emails create CRM records (no login account).",
      importTarget: "Import into",
      importFile: "File",
      importDownloadTemplate: "Download CSV template",
      importSubmit: "Import",
      importUploading: "Importing…",
      importSuccess:
        "Imported: {created} created, {updated} updated, {skipped} skipped.",
      importError: "Import failed.",
      importMissingFile: "Choose a CSV or Excel file.",
      missing_file: "Choose a CSV or Excel file.",
      unsupported_file_type: "Use a .csv or .xlsx file.",
      empty_file: "No data rows found.",
      too_many_rows: "Too many rows (max 2000).",
      invalid_file_size: "File is empty or larger than 5MB.",
      invalid_target: "Choose Students or Companies.",
      search: "Search",
      searchPlaceholder: "Name, email, plan, stage…",
      filterType: "Type",
      filterStage: "Stage",
      filterPlan: "Plan",
      filterStatus: "Status",
      filterNationality: "Nationality",
      filterSector: "Sector",
      filterSeniority: "Seniority",
      filterCredits: "Credits",
      creditsMin: "Min",
      creditsMax: "Max",
      filterAll: "All",
      clearFilters: "Clear filters",
      empty: "No contacts yet",
      name: "Name",
      email: "Email",
      plan: "Plan",
      status: "Status",
      sector: "Sector",
      credits: "Credits",
      creditHistoryTitle: "Credit history",
      creditHistoryEmpty: "No credit transactions",
      tx_stripe_topup: "Card top-up",
      tx_manual_topup: "Top-up (approved)",
      tx_redeem: "Content unlock",
      tx_referral: "Referral bonus",
      tx_welcome: "Welcome credits",
      tx_profile_complete: "Profile complete bonus",
      tx_other: "Adjustment",
      typeColumn: "Type",
      stageColumn: "Stage",
      ownerColumn: "Owner",
      lastActivityColumn: "Last activity",
      valueColumn: "Value",
      detailTitle: "Contact",
      noPlan: "No plan",
      planTrackA: "Set Track A",
      planTrackB: "Set Track B",
      suspend: "Suspend",
      activate: "Activate",
      edit: "Edit",
      viewAsUser: "View as user",
      viewAsError: "Could not open portal.",
      addNote: "Add note",
      saveNote: "Save note",
      activityTitle: "Activity",
      activityEmpty: "No activity yet",
      statTotalContacts: "Total contacts",
      statOpenDeals: "Open deals",
      statActiveCompanies: "Active companies",
      statNewLeads: "New leads (7d)",
      dealPipelineTitle: "Deal pipeline",
      contactsTableTitle: "All contacts",
      dealStage_new: "New",
      dealStage_contacted: "Contacted",
      dealStage_qualified: "Qualified",
      dealStage_won: "Won",
    },
    account: {
      accountEyebrow: "My profile",
      accountTitle: "Account & profile.",
      accountSubtitle: "This is what you see, not what companies or candidates see.",
      uploadPhoto: "Upload photo",
      removePhoto: "Remove",
      photoDropzone: "JPG or PNG. Square works best.",
      personalDetailsTitle: "Personal details",
      fullName: "Full name",
      roleLabel: "Role",
      roleAdmin: "Admin",
      email: "Email",
      phone: "Phone",
      passwordTitle: "Password",
      currentPassword: "Current password",
      newPassword: "New password",
      notificationsTitle: "Notifications",
      notification_pending_requests: "New pending requests",
      notification_weekly_digest: "Weekly digest",
      notification_sms_alerts: "SMS alerts",
      saveChanges: "Save changes",
      saveSuccess: "Saved.",
      saveError: "Could not save.",
      loadError: "Could not load your account. Try again.",
      retry: "Retry",
      loading: "Loading…",
      degradedWarning:
        "Profile details may be incomplete while the database is slow.",
      uploadProgress: "Uploading…",
      uploadError: "Upload failed. Try a smaller JPG or PNG.",
      photoReady: "Photo ready — click Save changes.",
      photoSaved: "Photo saved.",
      storage_not_configured: "Storage is not configured.",
      upload_failed: "Upload failed. Try a smaller JPG or PNG.",
    },
    content: {
      library: "Content library",
      home: "Homepage",
      about: "About page",
      careers: "Careers",
      roles: "Browse roles",
      journal: "Journal",
      howItWorks: "How it works",
      pricing: "Pricing copy",
      tracks: "Tracks copy",
      pages: "Custom pages",
      forms: "Custom forms",
      edit: "Edit",
      create: "Create",
      empty: "No items yet",
      titleColumn: "Title",
      statusColumn: "Status",
      actionsColumn: "Actions",
      search: "Search",
      searchPlaceholder: "Title or name",
      filterStatus: "Status",
      filterCategory: "Category",
      filterSector: "Sector",
      filterDepartment: "Department",
      filterType: "Type",
      filterAll: "All",
      clearFilters: "Clear filters",
      eyebrow: "Admin · Homepage Content",
      title: "Video cards & podcast episodes.",
      subtitle:
        "Everything shown in the public homepage's Stories and Podcast sections is managed here — no code changes needed to add, reorder, or retire an item.",
      libraryEyebrow: "Admin",
      libraryTitle: "Content library",
      librarySubtitle:
        "Materials students can redeem with credits — coaching, webinars, and premium placement packages.",
      homeTitle: "Homepage",
      videos: "Video cards",
      videosTitle: "Video cards",
      podcast: "Podcast episodes",
      podcastTitle: "Podcast episodes",
      aboutTitle: "About",
      howItWorksTitle: "How it works",
      pricingTitle: "Pricing",
      tracksTitle: "Tracks",
      rolesTitle: "Browse roles",
      pagesTitle: "Custom pages",
      formsTitle: "Custom forms",
      journalTitle: "Journal",
      currentRoutesLabel: "Routes bar label",
      currentRoutesItems: "Routes marquee items",
      routeCode: "Code (e.g. AMS)",
      routeLabel: "Optional label",
      routesMarquee: "Marquee behaviour",
      marqueeEnabled: "Animate marquee",
      marqueeSpeedSec: "Loop duration (seconds — lower is faster)",
      marqueeDirection: "Direction",
      marqueeEasing: "Transition / easing",
      marqueePauseOnHover: "Pause on hover",
      marqueeSeparator: "Separator between items",
      corridorChips: "Corridor route chips",
      chip: "Route (e.g. AMS → DXB)",
      corridorChipsMarquee: "Corridor chips ticker",
      addRow: "Add route",
      removeRow: "Remove",
      youtubeSyncTitle: "YouTube playlist sync",
      youtubeSyncBody:
        "Paste a playlist URL. Daily sync (and Sync now) pulls videos into homepage Stories and paid portal libraries.",
      youtubePlaylistUrl: "Playlist URL or ID",
      youtubeSyncEnabled: "Sync enabled",
      youtubeHomepageLimit: "Homepage cards",
      youtubeLibraryLimit: "Library size",
      youtubeLastSynced: "Last synced",
      youtubeLastError: "Error",
      youtubeSave: "Save playlist settings",
      youtubeSaving: "Saving…",
      youtubeSaveOk: "Playlist settings saved.",
      youtubeSaveFailed: "Could not save settings.",
      youtubeSyncNow: "Sync now",
      youtubeSyncing: "Syncing…",
      youtubeSyncOk: "Synced {count} videos",
      youtubeSyncFailed: "Sync failed",
      youtubeSyncSkipped: "Sync skipped",
      youtubeSourceBadge: "YouTube",
      liveCount: "live",
      videosTab: "Video cards",
      podcastTab: "Podcast episodes",
      addVideo: "+ Add video card",
      addEpisode: "+ Add episode",
      status_live: "Live",
      status_draft: "Draft",
      connectTitle: "How this connects to the public site",
      connectBody:
        "Homepage Stories shows the latest synced cards (default 3). Paid student and employer dashboards unlock the fuller private library.",
    },
    settings: {
      settingsTitle: "Workspace settings.",
      workspaceEyebrow: "Admin · Settings",
      workspaceSubtitle: "General configuration for the NextGen Move workspace.",
      teamMembersTitle: "Team members",
      teamMembersBody: "Invite and manage admin users.",
      manageTeam: "Manage team →",
      securityTitle: "Security",
      require2fa: "Require two-factor authentication",
      require2faHelp: "Applies to all team members with admin access",
      sessionExpireDays: "Auto-expire sessions after N days",
      sessionExpireHelp: "Forces re-login on all devices (1–14 days)",
      securityEditHint: "Edit require2fa and sessionExpireDays in the workspace editor below.",
      billingTitle: "Billing",
      operatorPlanLabel: "Operator plan",
      operatorPlanDetail: "Unlimited students · billed monthly",
      manageBilling: "Manage billing",
      toggleOn: "On",
      toggleOff: "Off",
      editWorkspace: "Edit workspace fields",
      timezone: "Timezone",
      defaultCurrency: "Default currency",
      billingManageUrl: "Billing manage URL",
      youtubePlaylistUrl: "YouTube playlist URL",
      youtubeSyncEnabled: "YouTube sync enabled",
      youtubeHomepageLimit: "Homepage video limit",
      youtubeLibraryLimit: "Portal video library limit",
      youtubeLastSyncedAt: "Last YouTube sync",
      youtubeLastSyncError: "Last YouTube sync error",
      siteName: "Site name",
      tagline: "Tagline",
      siteDescription: "Footer / SEO description",
      logoUrl: "Logo",
      faviconUrl: "Favicon",
      defaultMetaTitle: "Default meta title",
      defaultMetaDescription: "Default meta description",
      brandMark: "Brand mark",
      contactEmail: "Contact email",
      footerCopyright: "Footer copyright",
      footerAttributionPrefix: "Footer attribution prefix",
      footerAttributionName: "Footer attribution name",
      footerAttributionUrl: "Footer attribution URL",
      socialLinks: "Social links",
      socialMediaTitle: "Social media",
      socialLinksHelp:
        "These links show as icons in the bottom-right of the site footer and on the contact page.",
      socialLinksEmpty: "No social links yet.",
      socialPlatform: "Platform",
      addSocialLink: "Add social link",
      saveSocialLinks: "Save social links",
      saving: "Saving…",
      platformLinkedin: "LinkedIn",
      platformInstagram: "Instagram",
      platformX: "X",
      platformFacebook: "Facebook",
      platformYoutube: "YouTube",
      platformTiktok: "TikTok",
      platformWhatsapp: "WhatsApp",
      platformGithub: "GitHub",
      platformOther: "Other",
      socialKey: "Key",
      socialLabel: "Label",
      socialUrl: "URL",
      navLabels: "Navigation labels",
      footerLinks: "Footer link groups",
      footerGroupKey: "Group key",
      footerGroupLabel: "Group label",
      footerGroupLinks: "Links",
      footerLinkKey: "Link key",
      footerLinkHref: "Href",
      footerLinkLabel: "Link label",
      pageLabels: "Page labels",
      formLabels: "Form labels",
      authLabels: "Auth labels",
      keyLabel: "Key",
      valueLabel: "Value",
      addRow: "Add row",
      removeRow: "Remove",
      howItWorks: "How it works",
      forCompanies: "For companies",
      pricing: "Pricing",
      signIn: "Sign in",
      headerCta: "Header CTA",
      headerCtaHref: "Header CTA link",
      about: "About",
      careers: "Careers",
      journal: "Journal",
      browseRoles: "Browse roles",
      credits: "Credits",
      tracks: "Tracks",
      requestTalent: "Request talent",
      companySection: "Company section",
      talentSection: "Talent section",
      employersSection: "Employers section",
      title: "Page name",
      slug: "URL slug",
      eyebrow: "Eyebrow",
      headline: "Headline",
      body: "Body",
      metaTitle: "SEO / meta title",
      metaDescription: "SEO / meta description",
      navLabel: "Nav / link label",
      showInHeader: "Show in header navigation",
      showInNav: "Show in nav",
      footerGroup: "Show in footer column",
      footerGroupNone: "None (hidden from footer)",
      footerGroupCompany: "Company",
      footerGroupTalent: "Talent",
      footerGroupEmployers: "Employers",
      createTitle: "Create page",
      editTitle: "Edit page",
      description: "Description",
      submitLabel: "Submit label",
      successMessage: "Success message",
      formFields: "Form fields",
      fieldKey: "Field key",
      fieldLabel: "Field label",
      fieldType: "Field type",
      fieldRequired: "Required",
      fieldPlaceholder: "Placeholder",
      fieldOptions: "Options (comma-separated)",
      caseStudyQuote: "Case study quote",
      caseStudyQuoteText: "Quote",
      caseStudyCompany: "Company name",
      caseStudyStat: "Result stat",
    },
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
        "In Stripe Dashboard → Developers → Webhooks, add endpoint: {APP_URL}/api/webhooks/stripe — events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed",
      stripeWebhookPath: "/api/webhooks/stripe",
      sendgridHint:
        "Legacy SendGrid — Venturo sends transactional email via Resend.",
      sendgridApiKey: "API key (SG.…)",
      sendgridFromEmail: "From email (verified sender)",
      sendgridFromName: "From name",
      sendgridDefaultFromName: "Venturo",
      sendgridHelp:
        "Prefer connecting Resend. Templates live in email_templates.",
      resendHint:
        "Connect Resend for all notification emails (signup OTP, security, credits, billing, CRM).",
      resendApiKey: "API key (re_…)",
      resendFromEmail: "From email (verified domain)",
      resendFromName: "From name",
      resendDefaultFromName: "Venturo",
      resendHelp:
        "Verify your domain in Resend. Templates live in email_templates and use site branding from Site settings.",
      twilioAccountSid: "Account SID",
      twilioAuthToken: "Auth token",
      twilioFromSms: "SMS from number",
      twilioFromWhatsApp: "WhatsApp from number",
      twilioHelp:
        "Used for CRM outreach only. Signup phone verification uses Firebase Phone Auth OTP.",
      youtubeHint:
        "Connect a YouTube Data API key so Venturo can sync your playlist into homepage Stories and paid portal libraries.",
      youtubeApiKey: "YouTube Data API key",
      youtubeHelp:
        "Create a key in Google Cloud Console → APIs & Services → Credentials, enable YouTube Data API v3, then paste the key here. Playlist URL is set under Admin → Homepage Content.",
      loadError: "Could not load integrations.",
      degradedWarning:
        "Live status may be outdated — Firestore is slow or over quota. Cards still show so you can reconnect.",
    },
    users: {
      title: "Team & users",
      eyebrow: "Admin · Users",
      subtitle: "Every account on the platform — admins, employers, and students.",
      search: "Search",
      searchPlaceholder: "Name, email, or phone",
      filterRole: "Role",
      filterStatus: "Status",
      filterAll: "All",
      clearFilters: "Clear filters",
      roleStudent: "Student",
      roleCompany: "Company",
      roleAdmin: "Admin",
      statusActive: "Active",
      statusSuspended: "Suspended",
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
      viewAsUser: "View as user",
      viewAsError: "Could not open portal.",
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
  },
};

const SITE_SETTINGS = {
  siteName: "",
  tagline: "",
  siteDescription: "",
  logoUrl: "",
  faviconUrl: "",
  defaultMetaTitle: "",
  defaultMetaDescription: "",
  brandMark: "",
  contactEmail: "",
  footerCopyright: "",
  footerAttributionPrefix: "",
  footerAttributionName: "",
  footerAttributionUrl: "",
  timezone: "",
  defaultCurrency: "",
  require2fa: false,
  sessionExpireDays: 5,
  operatorPlanLabel: "",
  operatorPlanDetail: "",
  billingManageUrl: "",
  socialLinks: [] as unknown[],
  navLabels: emptyStrings(NAV_LABEL_KEYS),
  footerLinks: [] as unknown[],
  formLabels: {},
  pageLabels: {},
  authLabels: emptyStrings(AUTH_LABEL_KEYS),
  employerNavLabels: emptyStrings(EMPLOYER_NAV_KEYS),
  employerPageLabels: {},
  employerNotificationKeys: [] as string[],
  studentNavLabels: emptyStrings(STUDENT_NAV_KEYS),
  studentPageLabels: {},
  studentNotificationKeys: [] as string[],
  adminNavLabels: emptyStrings(ADMIN_NAV_KEYS),
  adminPageLabels: {},
};

async function seedAdminUser(auth: ReturnType<typeof getAuth>, db: Firestore) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env.local");
  }

  let uid: string;
  let created = false;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`  admin user exists (${email}) — ensuring role=admin`);
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";

    if (code !== "auth/user-not-found") {
      throw error;
    }

    const record = await auth.createUser({
      email,
      password,
    });
    uid = record.uid;
    created = true;
    console.log(`  created admin auth user (${email})`);
  }

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const now = FieldValue.serverTimestamp();

  if (!userSnap.exists) {
    await userRef.set(
      stripUndefined({
        uid,
        email,
        role: "admin",
        displayName: "",
        photoUrl: null,
        status: "active",
        createdAt: now,
        lastLoginAt: null,
      }),
    );
    console.log("  created users/{uid} document");
  } else {
    await userRef.set(
      stripUndefined({
        role: "admin",
        status: "active",
        email,
      }),
      { merge: true },
    );
    console.log("  updated users/{uid} → role=admin, status=active");
  }

  return { uid, created };
}

async function upsertSingleton(
  db: Firestore,
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  mode: "create-only" | "merge",
) {
  const ref = db.collection(collection).doc(docId);
  const snap = await ref.get();
  const payload = stripUndefined({ id: docId, ...data });

  if (mode === "create-only") {
    if (snap.exists) {
      console.log(`  skip ${collection}/${docId} (already exists)`);
      return;
    }

    await ref.set(payload);
    console.log(`  created ${collection}/${docId}`);
    return;
  }

  await ref.set(payload, { merge: true });
  console.log(`  upserted ${collection}/${docId}`);
}

async function seedTaxonomies(db: Firestore) {
  await upsertSingleton(db, "taxonomies", "default", TAXONOMIES, "merge");
}

async function seedProgramLevers(db: Firestore) {
  const ref = db.collection("program_levers").doc("default");
  const snap = await ref.get();
  const existing = snap.data() ?? {};
  const existingWays = Array.isArray(existing.waysToEarn)
    ? existing.waysToEarn
    : [];

  const existingPackages = Array.isArray(existing.creditTopUpPackages)
    ? existing.creditTopUpPackages
    : [];

  const base = {
    id: "default",
    trackAMonthly: 50,
    trackAMatchFee: 200,
    trackBMonthly: 125,
    placementFeeEur: existing.placementFeeEur ?? 350,
    creditsPerEuro: existing.creditsPerEuro ?? 4,
    lowCreditThreshold: existing.lowCreditThreshold ?? 50,
    creditTopUpPackages: existingPackages.length
      ? existingPackages
      : [
          { id: "pack_400", label: "Starter pack", credits: 400, priceEur: 100 },
          { id: "pack_800", label: "Coach pack", credits: 800, priceEur: 200 },
          { id: "pack_1600", label: "Premium pack", credits: 1600, priceEur: 400 },
        ],
    waysToEarn: existingWays.length ? existingWays : DEFAULT_WAYS_TO_EARN,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(stripUndefined(base), { merge: true });
  console.log(
    existingWays.length
      ? "  updated program_levers/default pricing (waysToEarn preserved)"
      : "  upserted program_levers/default with waysToEarn defaults",
  );
}

async function seedCmsPages(db: Firestore) {
  const pages: Array<[string, Record<string, unknown>]> = [
    ["page_home", PAGE_HOME],
    ["page_about", PAGE_ABOUT],
    ["page_how_it_works", PAGE_HOW_IT_WORKS],
    ["page_pricing", PAGE_PRICING],
    ["page_tracks", PAGE_TRACKS],
  ];

  for (const [collection, defaults] of pages) {
    const ref = db.collection(collection).doc("default");
    // Full merge so public pages show complete marketing CMS content.
    // Admin can edit afterward; re-seed refreshes these singleton defaults.
    await ref.set(stripUndefined({ id: "default", ...defaults }), { merge: true });
    console.log(`  upserted ${collection}/default (CMS marketing content)`);
  }
}

async function seedSiteSettings(db: Firestore) {
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const existing = (snap.data() ?? {}) as Record<string, unknown>;

  const merged = mergeEmptyFields(existing, {
    id: "default",
    ...SITE_SETTINGS,
    ...OPERATIONAL_SITE_SETTINGS,
  });

  await ref.set(stripUndefined(merged), { merge: true });
  console.log("  upserted site_settings/default (filled empty UI labels)");
}

async function seedIntegrations(db: Firestore) {
  const integrations = [
    {
      id: "stripe",
      name: "Stripe",
      category: "Payments & subscriptions",
      description:
        "Subscriptions with automatic monthly debit + one-time credit top-ups. Paste sk_/pk_/whsec keys to go live.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: { category: "Payments & subscriptions" },
    },
    {
      id: "resend",
      name: "Resend",
      category: "Transactional email",
      description:
        "All notification emails — paste re_ API key + verified from address to go live.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: { category: "Transactional email" },
    },
    {
      id: "sendgrid",
      name: "SendGrid (legacy)",
      category: "Transactional email",
      description:
        "Legacy email provider — Venturo now sends via Resend. Kept for reference only.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: { category: "Transactional email" },
    },
    {
      id: "twilio",
      name: "Twilio",
      category: "SMS",
      description: "CRM SMS / WhatsApp outreach (signup phone OTP uses Firebase).",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: { category: "SMS" },
    },
    {
      id: "youtube",
      name: "YouTube",
      category: "Media",
      description:
        "YouTube Data API — sync a playlist into homepage Stories and paid portal video libraries.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: { category: "Media" },
    },
  ];

  for (const item of integrations) {
    const ref = db.collection("integrations").doc(item.id);
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`  skip integrations/${item.id} (already exists)`);
      continue;
    }
    await ref.set(stripUndefined(item));
    console.log(`  created integrations/${item.id}`);
  }
}

async function seedEmailTemplates(db: Firestore) {
  for (const template of EMAIL_TEMPLATES) {
    const ref = db.collection("email_templates").doc(template.id);
    const snap = await ref.get();
    if (snap.exists) {
      // Fill empty subject/body only — do not overwrite admin edits
      const existing = snap.data() ?? {};
      const patch: Record<string, unknown> = {};
      if (!existing.subject) patch.subject = template.subject;
      if (!existing.htmlBody) patch.htmlBody = template.htmlBody;
      if (!existing.textBody) patch.textBody = template.textBody;
      if (existing.preferenceKey === undefined) {
        patch.preferenceKey = template.preferenceKey;
      }
      if (!existing.category) patch.category = template.category;
      if (existing.enabled === undefined) patch.enabled = true;
      if (!existing.name) patch.name = template.name;
      if (Object.keys(patch).length) {
        await ref.set(stripUndefined(patch), { merge: true });
        console.log(`  filled email_templates/${template.id}`);
      } else {
        console.log(`  skip email_templates/${template.id}`);
      }
      continue;
    }
    await ref.set(stripUndefined({ ...template }));
    console.log(`  created email_templates/${template.id}`);
  }
}

async function seedPipelineStages(db: Firestore) {
  for (const stage of PIPELINE_STAGES) {
    const ref = db.collection("pipeline_stages").doc(stage.id);
    await ref.set(
      stripUndefined({
        id: stage.id,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        isTerminal: stage.isTerminal,
      }),
      { merge: true },
    );
    console.log(`  upserted pipeline_stages/${stage.id}`);
  }
}

async function main() {
  console.log("NextGen Move seed — operational config only\n");

  initFirebaseAdmin();

  const auth = getAuth();
  const db = getFirestore();

  console.log("1. Super-admin user");
  await seedAdminUser(auth, db);

  console.log("\n2. Taxonomies");
  await seedTaxonomies(db);

  console.log("\n3. Program levers");
  await seedProgramLevers(db);

  console.log("\n4. CMS page content (fill empty fields only)");
  await seedCmsPages(db);

  console.log("\n5. Site settings (UI labels)");
  await seedSiteSettings(db);

  console.log("\n6. Integrations shells");
  await seedIntegrations(db);

  console.log("\n7. Email templates");
  await seedEmailTemplates(db);

  console.log("\n8. Pipeline stages");
  await seedPipelineStages(db);

  console.log("\nSeed complete.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
