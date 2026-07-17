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
  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown>) || {}),
  };
  adminPageLabels.dashboard = {
    ...((adminPageLabels.dashboard as Record<string, string>) || {}),
    eyebrow: "Admin",
    title: "Operations dashboard.",
    subtitle: "Real-time overview of Nextgenmove placements and activity.",
    activeStudents: "Active students",
    pendingRequestsCount: "Open requests",
    placedThisQuarter: "Placed this Q",
    avgTimeToPlaceDays: "Avg time-to-place",
    daysSuffix: "d",
    contentLibraryTitle: "Content library",
    uploadMaterial: "+ Upload material",
    contentEmpty: "No content items yet.",
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
  };
  adminPageLabels.shell = {
    workspaceSection: "Workspace",
    workspaceStudent: "Student",
    workspaceEmployer: "Employer",
    workspaceAdmin: "Admin",
    adminSection: "Admin",
    globalSettings: "Global Settings",
    publicSite: "Public site",
    signOut: "Sign out",
  };
  const contentLabels = {
    ...((adminPageLabels.content as Record<string, string>) || {}),
    library: "Content library",
    libraryEyebrow: "Admin",
    libraryTitle: "Content library",
    librarySubtitle:
      "Materials students can redeem with credits — coaching, webinars, and premium placement packages.",
    videos: "Video cards",
    videosTitle: "Video cards",
    podcast: "Podcast episodes",
    podcastTitle: "Podcast episodes",
    home: "Homepage",
    homeTitle: "Homepage",
    eyebrow: "Admin · Homepage Content",
    title: "Video cards & podcast episodes.",
    subtitle:
      "Everything shown in the public homepage's Stories and Podcast sections is managed here — no code changes needed to add, reorder, or retire an item.",
  };
  adminPageLabels.content = contentLabels;

  const adminNavLabels = {
    ...((existing.adminNavLabels as Record<string, string>) || {}),
    dashboard: "Dashboard",
    crm: "CRM",
    integrations: "Integrations",
    library: "Content Library",
    content: "Homepage Content",
    levers: "Program Levers",
    settings: "Settings",
    users: "Users",
    account: "My account",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      adminNavLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("dashboard labels patched");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
