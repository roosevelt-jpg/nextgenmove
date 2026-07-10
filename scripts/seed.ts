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

const EMPLOYER_NAV_KEYS = ["talentPool", "pipeline", "shortlist", "profile", "settings"];
const STUDENT_NAV_KEYS = ["dashboard", "store", "profile", "settings"];
const ADMIN_NAV_KEYS = ["dashboard", "levers", "crm", "content", "integrations", "users"];

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
    "We pair every candidate with a coach and every employer with a pre-screened match — so relocating for work feels like a well-run itinerary.",
  ctaPrimaryLabel: "Explore open roles",
  ctaPrimaryHref: "/careers-talent",
  ctaSecondaryLabel: "I'm hiring →",
  ctaSecondaryHref: "/request-talent",
  hubLabel: "DXB",
  currentRoutesLabel: "Current routes",
  originCities: [
    { code: "AMS", label: "Amsterdam", x: 120, y: 160 },
    { code: "BER", label: "Berlin", x: 180, y: 140 },
    { code: "CAI", label: "Cairo", x: 220, y: 220 },
    { code: "WAW", label: "Warsaw", x: 200, y: 130 },
    { code: "PAR", label: "Paris", x: 140, y: 150 },
    { code: "LIS", label: "Lisbon", x: 90, y: 190 },
    { code: "DXB", label: "Dubai", x: 280, y: 210 },
  ],
  boardingPass: {
    routeLabel: "AMS → DXB",
    passengerLabel: "Passenger",
    passengerValue: "",
    coachLabel: "Coach",
    coachValue: "Lemoni",
    statusLabel: "Status",
    statusValue: "Boarding",
    classLabel: "Class",
    classValue: "Track B",
    refLabel: "Ref",
    refValue: "NGM-2030",
  },
  itineraryEyebrow: "The itinerary",
  itineraryHeadline: "Three legs. One arrival.",
  testimonialQuote: "",
  testimonialAttribution: "",
  testimonialBadge: "",
  talentCta: {
    title: "Your seat is waiting.",
    body: "Build your profile, get matched, and relocate with a coach on the route.",
    ctaLabel: "Get started",
    ctaHref: "/sign-up",
  },
  companyCta: {
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
      title: "Build your profile",
      description:
        "Tell us your skills, sector, and where you want to land. Your coach verifies and sharpens it.",
    },
    {
      legNumber: 2,
      title: "Get matched & coached",
      description:
        "We introduce you to vetted employers, and coach you through every interview and offer.",
    },
    {
      legNumber: 3,
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
      title: "Build your profile",
      description:
        "Tell us your skills, sector, and where you want to land. Your coach verifies and sharpens it.",
    },
    {
      legNumber: 2,
      title: "Get matched & coached",
      description:
        "We introduce you to vetted employers, and coach you through every interview and offer.",
    },
    {
      legNumber: 3,
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
  contactEmail: "",
  socialLinks: {},
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
    signIn: "Sign in",
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
  },
  employerNavLabels: {
    talentPool: "Talent pool",
    pipeline: "Pipeline",
    shortlist: "Shortlist",
    profile: "Profile",
    settings: "Settings",
  },
  studentNavLabels: {
    dashboard: "Dashboard",
    store: "Content store",
    profile: "Profile",
    settings: "Settings",
  },
  adminNavLabels: {
    dashboard: "Dashboard",
    levers: "Levers",
    crm: "CRM",
    content: "Content",
    integrations: "Integrations",
    users: "Users",
  },
  adminPageLabels: {
    dashboard: {
      title: "Admin dashboard",
      activeCompanies: "Active companies",
      activeStudents: "Active students",
      openPipelineMatches: "Open matches",
      pendingRequestsCount: "Pending requests",
      liveContentItems: "Live content",
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
    content: {
      library: "Content library",
      home: "Homepage",
      about: "About page",
      careers: "Careers",
      journal: "Journal",
      howItWorks: "How it works",
      pricing: "Pricing copy",
      tracks: "Tracks copy",
      edit: "Edit",
      create: "Create",
      empty: "No items yet",
      titleColumn: "Title",
      statusColumn: "Status",
      actionsColumn: "Actions",
      homeTitle: "Homepage",
      aboutTitle: "About",
      howItWorksTitle: "How it works",
      pricingTitle: "Pricing",
      tracksTitle: "Tracks",
    },
  },
};

const SITE_SETTINGS = {
  siteName: "",
  tagline: "",
  logoUrl: "",
  contactEmail: "",
  socialLinks: {},
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

  const base = {
    id: "default",
    trackAMonthly: 50,
    trackAMatchFee: 200,
    trackBMonthly: 125,
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
    const snap = await ref.get();
    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const merged = mergeEmptyFields(existing, {
      id: "default",
      ...defaults,
    });
    await ref.set(stripUndefined(merged), { merge: true });
    console.log(`  upserted ${collection}/default (filled empty CMS fields)`);
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

  console.log("\n6. Pipeline stages");
  await seedPipelineStages(db);

  console.log("\nSeed complete.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
