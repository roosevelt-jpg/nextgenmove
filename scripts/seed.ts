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
  eyebrowText: "",
  headline: "",
  headlineEmphasis: "",
  subtext: "",
  ctaPrimaryLabel: "",
  ctaPrimaryHref: "",
  ctaSecondaryLabel: "",
  ctaSecondaryHref: "",
  hubLabel: "",
  originCities: [] as unknown[],
  statBlocks: [] as unknown[],
  steps: [] as unknown[],
};

const PAGE_ABOUT = {
  heroHeadline: "",
  heroSubtext: "",
  missionBody: "",
  statBlocks: [] as unknown[],
  teamMembers: [] as unknown[],
  foundingStory: "",
};

const PAGE_HOW_IT_WORKS = {
  steps: [] as unknown[],
  faqItems: [] as unknown[],
};

const PAGE_PRICING = {
  trackAHeadline: "",
  trackAFeatures: [] as string[],
  trackBHeadline: "",
  trackBFeatures: [] as string[],
  faqItems: [] as unknown[],
  ctaLabel: "",
};

const PAGE_TRACKS = {
  trackABody: "",
  trackBBody: "",
  comparisonRows: [] as unknown[],
  caseStudyQuote: null,
};

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
  tagline: "",
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
  },
  pageLabels: {
    pricingTitle: "Pricing",
    trackAMonthlyLabel: "€{amount}/mo",
    trackAMatchFeeLabel: "€{amount} per match",
    trackBMonthlyLabel: "€{amount}/mo",
    creditsTitle: "Credits",
    creditsContentTitle: "Content store",
    creditsWaysToEarnTitle: "Ways to earn credits",
    creditsCostLabel: "{credits} credits",
    creditsEarnLabel: "+{credits} credits",
    missionTitle: "Mission",
    teamTitle: "Team",
    foundingStoryTitle: "Founding story",
    faqTitle: "FAQ",
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
  const base = {
    id: "default",
    trackAMonthly: 50,
    trackAMatchFee: 200,
    trackBMonthly: 125,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!snap.exists) {
    await ref.set(
      stripUndefined({
        ...base,
        waysToEarn: [],
      }),
    );
    console.log("  created program_levers/default");
    return;
  }

  const existing = snap.data() ?? {};
  await ref.set(
    stripUndefined({
      ...base,
      waysToEarn: Array.isArray(existing.waysToEarn) ? existing.waysToEarn : [],
    }),
    { merge: true },
  );
  console.log("  updated program_levers/default pricing (waysToEarn preserved)");
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

  console.log("\n4. CMS singleton shells (create if missing)");
  await upsertSingleton(db, "page_home", "default", PAGE_HOME, "create-only");
  await upsertSingleton(db, "page_about", "default", PAGE_ABOUT, "create-only");
  await upsertSingleton(db, "page_how_it_works", "default", PAGE_HOW_IT_WORKS, "create-only");
  await upsertSingleton(db, "page_pricing", "default", PAGE_PRICING, "create-only");
  await upsertSingleton(db, "page_tracks", "default", PAGE_TRACKS, "create-only");

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
