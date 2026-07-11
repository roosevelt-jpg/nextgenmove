/**
 * Patch advanced filter labels across admin / employer / student surfaces.
 * Run: npx tsx scripts/patch-advanced-filters-labels.ts
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

  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown>) || {}),
  };

  adminPageLabels.users = {
    ...((adminPageLabels.users as Record<string, string>) || {}),
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
  };

  adminPageLabels.crm = {
    ...((adminPageLabels.crm as Record<string, string>) || {}),
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
  };

  adminPageLabels.content = {
    ...((adminPageLabels.content as Record<string, string>) || {}),
    search: "Search",
    searchPlaceholder: "Title or name",
    filterStatus: "Status",
    filterCategory: "Category",
    filterSector: "Sector",
    filterDepartment: "Department",
    filterType: "Type",
    filterAll: "All",
    clearFilters: "Clear filters",
  };

  const employerPageLabels = {
    ...((existing.employerPageLabels as Record<string, unknown>) || {}),
  };

  employerPageLabels.talentPool = {
    ...((employerPageLabels.talentPool as Record<string, string>) || {}),
    clearFilters: "Clear filters",
    filterAll: "All",
  };

  employerPageLabels.pipeline = {
    ...((employerPageLabels.pipeline as Record<string, string>) || {}),
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
  };

  employerPageLabels.shortlist = {
    ...((employerPageLabels.shortlist as Record<string, string>) || {}),
    search: "Search",
    searchPlaceholder: "Name, email, sector, city…",
    clearFilters: "Clear filters",
  };

  const studentPageLabels = {
    ...((existing.studentPageLabels as Record<string, unknown>) || {}),
  };

  studentPageLabels.store = {
    ...((studentPageLabels.store as Record<string, string>) || {}),
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
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      employerPageLabels,
      studentPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched advanced filter labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
