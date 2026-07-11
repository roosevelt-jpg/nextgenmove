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
];

const EMPLOYER_NAV_KEYS = [
  "dashboard",
  "talentPool",
  "pipeline",
  "shortlist",
  "profile",
  "settings",
];
const STUDENT_NAV_KEYS = ["dashboard", "store", "profile", "settings"];
const ADMIN_NAV_KEYS = [
  "dashboard",
  "levers",
  "crm",
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
  eyebrowText: "Relocation, engineered",
  headline: "Your next step,",
  headlineEmphasis: "engineered.",
  subtext:
    "NextGen Move pairs you with a personal coach, a vetted employer, and a visa-ready path abroad — from first application to first day.",
  ctaPrimaryLabel: "Explore open roles",
  ctaPrimaryHref: "/careers-talent",
  ctaSecondaryLabel: "I'm hiring →",
  ctaSecondaryHref: "/request-talent",
  hubLabel: "DXB",
  currentRoutesLabel: "Current routes",
  globalReachEyebrow: "Global reach",
  globalReachHeadline: "Six corridors. One arrival city.",
  globalReachBody:
    "Every route on this map is live — a coach on one end, a vetted employer on the other, and a candidate somewhere mid-flight.",
  corridorChips: [
    "AMS → DXB",
    "BER → DXB",
    "CAI → DXB",
    "WAW → DXB",
    "PAR → DXB",
    "LIS → DXB",
  ],
  originCities: [
    {
      code: "AMS",
      label: "Amsterdam",
      initials: "SK",
      x: 80,
      y: 140,
      avatarX: 80,
      avatarY: 105,
    },
    {
      code: "BER",
      label: "Berlin",
      initials: "JL",
      x: 70,
      y: 250,
      avatarX: 55,
      avatarY: 250,
    },
    {
      code: "CAI",
      label: "Cairo",
      initials: "AM",
      x: 90,
      y: 360,
      avatarX: 78,
      avatarY: 398,
    },
    {
      code: "WAW",
      label: "Warsaw",
      initials: "PV",
      x: 420,
      y: 120,
      avatarX: 430,
      avatarY: 85,
    },
    {
      code: "PAR",
      label: "Paris",
      initials: "LB",
      x: 440,
      y: 260,
      avatarX: 465,
      avatarY: 260,
    },
    {
      code: "LIS",
      label: "Lisbon",
      initials: "CN",
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
    coachValue: "Lemoni",
    statusLabel: "Status",
    statusValue: "Boarding",
    classLabel: "Class",
    classValue: "Track B",
    refLabel: "Ref",
    refValue: "NGM-2038",
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
  testimonialAttribution: "Sara K. · Marketing lead · Placed via NextGen Move",
  testimonialBadge: "Placed 2023",
  talentCta: {
    eyebrow: "For talent",
    title: "Your seat is waiting.",
    body: "Build your profile, get matched, and relocate with a coach on the route.",
    ctaLabel: "Get started",
    ctaHref: "/sign-up",
  },
  companyCta: {
    eyebrow: "For companies",
    title: "A pool, pre-flown.",
    body: "Browse vetted talent or let Lemoni source and coach the match for you.",
    ctaLabel: "View plans",
    ctaHref: "/pricing",
  },
  statBlocks: [
    { label: "Active students", value: "248" },
    { label: "Placed this quarter", value: "41" },
    { label: "Avg. time to place", value: "38d" },
    { label: "Top match score", value: "94%" },
  ],
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
  siteName: "NextGen Move",
  tagline: "Relocation, engineered.",
  logoUrl: "",
  brandMark: "NG",
  contactEmail: "",
  timezone: "Europe/Amsterdam",
  defaultCurrency: "EUR",
  require2fa: false,
  sessionExpireDays: 5,
  operatorPlanLabel: "Operator plan",
  operatorPlanDetail: "Unlimited students · billed monthly",
  billingManageUrl: "",
  socialLinks: [] as Array<{ key: string; label: string; url: string }>,
  navLabels: {
    siteName: "NextGen Move",
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
  },
  authLabels: {
    signInTitle: "Sign in",
    signUpTitle: "Create account",
    emailLabel: "Email",
    passwordLabel: "Password",
    displayNameLabel: "Display name",
    roleLabel: "Account type",
    roleCompanyLabel: "Employer",
    roleStudentLabel: "Student",
    signInSubmitLabel: "Sign in",
    signUpSubmitLabel: "Create account",
    signInLinkLabel: "Already have an account? Sign in",
    signUpLinkLabel: "Need an account? Sign up",
    genericErrorLabel: "Something went wrong. Please try again.",
    sign_in_failed: "Sign in failed. Check your email and password.",
    register_failed: "Registration failed. Please try again.",
    email_exists: "An account with that email already exists.",
    invalid_request: "Please check the form and try again.",
    consent_required: "Please accept the required terms to continue.",
    photo_required: "Upload a profile photo to finish.",
    logo_required: "Upload your company logo to finish.",
    upload_failed: "Upload failed. Try again.",
    complete_failed: "Could not finish signup. Try again.",
    stepAccount: "1 · Account",
    stepDetails: "2 · Profile details",
    stepMedia: "3 · Photo / logo",
    continueLabel: "Continue",
    backLabel: "Back",
    createAccountLabel: "Create account",
    finishLabel: "Finish & go to dashboard",
    consentRequiredLabel:
      "I agree to NextGen Move processing my account data to run the platform.",
    consentMarketingLabel: "Send me occasional product updates (optional).",
    fullNameLabel: "Full name",
    phoneLabel: "Phone",
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
    companyNameLabel: "Company name",
    contactNameLabel: "Your name (contact)",
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
    forgotPasswordLinkLabel: "Forgot password?",
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
    successMessage: "Request received. We'll be in touch shortly.",
    formSuccess: "Thanks — we received your submission.",
    missing_required: "Please fill in all required fields.",
    submit_failed: "Could not submit. Please try again.",
    watchVideo: "Watch",
    hideVideo: "Hide video",
    openLink: "Open link",
    openContent: "Open",
    priceEurSuffix: " · €{amount}",
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
    title: "Get the next dispatch",
    subtitle: "One email a month. No noise.",
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
    aboutEyebrow: "About",
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
    levers: "Levers",
    crm: "CRM",
    content: "Content",
    settings: "Site settings",
    account: "My account",
    integrations: "Integrations",
    users: "Users",
  },
  adminNotificationKeys: ["pending_requests", "weekly_digest", "sms_alerts"],
  adminPageLabels: {
    dashboard: {
      title: "Admin dashboard",
      activeCompanies: "Active companies",
      activeStudents: "Active students",
      placedThisQuarter: "Placed this quarter",
      avgTimeToPlaceDays: "Avg time-to-place",
      daysSuffix: "d",
      openPipelineMatches: "Open matches",
      pendingRequestsCount: "Pending requests",
      liveContentItems: "Live content",
      contentLibraryTitle: "Content library",
      contentLibraryLink: "Manage catalog →",
      contentLivePill: "Live",
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
    crm: {
      eyebrow: "CRM",
      title: "All relationships, one place.",
      subtitle:
        "Every company, candidate, and inbound lead — tracked from first touch to placement.",
      contactsTab: "All contacts",
      companiesTab: "Companies",
      studentsTab: "Interns",
      search: "Search",
      empty: "No contacts yet",
      name: "Name",
      email: "Email",
      plan: "Plan",
      status: "Status",
      sector: "Sector",
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
      uploadProgress: "Uploading…",
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
      homeTitle: "Homepage",
      videos: "Video cards",
      videosTitle: "Video cards",
      podcast: "Podcast",
      podcastTitle: "Podcast episodes",
      aboutTitle: "About",
      howItWorksTitle: "How it works",
      pricingTitle: "Pricing",
      tracksTitle: "Tracks",
      rolesTitle: "Browse roles",
      pagesTitle: "Custom pages",
      formsTitle: "Custom forms",
      journalTitle: "Journal",
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
      siteName: "Site name",
      tagline: "Tagline",
      logoUrl: "Logo",
      brandMark: "Brand mark",
      contactEmail: "Contact email",
      socialLinks: "Social links",
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
      slug: "Slug",
      eyebrow: "Eyebrow",
      headline: "Headline",
      body: "Body",
      navLabel: "Nav label",
      showInNav: "Show in nav",
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
      empty: "No integrations configured",
      connect: "Connect",
      disconnect: "Disconnect",
      connectTitle: "Connect integration",
      cancel: "Cancel",
      host: "Host",
      apiKey: "API key",
      stripeHint:
        "Connect Stripe with live or test keys. Employer plans use monthly subscriptions with automatic card debit; student credit packs use one-time Checkout.",
      stripeSecretKey: "Secret key (sk_…)",
      stripePublishableKey: "Publishable key (pk_…)",
      stripeWebhookSecret: "Webhook signing secret (whsec_…)",
      stripeWebhookHelp:
        "In Stripe Dashboard → Developers → Webhooks, add endpoint: {APP_URL}/api/webhooks/stripe — events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed",
      stripeWebhookPath: "/api/webhooks/stripe",
      sendgridHint:
        "Connect SendGrid to send branded transactional email (signup, security, credits, billing).",
      sendgridApiKey: "API key (SG.…)",
      sendgridFromEmail: "From email (verified sender)",
      sendgridFromName: "From name",
      sendgridDefaultFromName: "NextGen Move",
      sendgridHelp:
        "Verify the from-address in SendGrid. Templates live in email_templates and use site branding from Site settings.",
    },
  },
};

const SITE_SETTINGS = {
  siteName: "",
  tagline: "",
  logoUrl: "",
  brandMark: "",
  contactEmail: "",
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
      description:
        "Subscriptions with automatic monthly debit + one-time credit top-ups. Paste sk_/pk_/whsec keys to go live.",
      iconUrl: "",
      status: "not_connected",
      connectedAt: null,
      config: {},
    },
    {
      id: "sendgrid",
      name: "SendGrid",
      description:
        "Branded transactional email — paste SG. API key + verified from address to go live.",
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
