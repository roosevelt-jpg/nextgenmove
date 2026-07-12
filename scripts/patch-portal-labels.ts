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
    subtitle: "Real-time overview of Venturo placements and activity.",
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
    ...((adminPageLabels.shell as Record<string, string>) || {}),
    workspaceSection: "Workspace",
    workspaceStudent: "Student",
    workspaceEmployer: "Employer",
    workspaceAdmin: "Admin",
    adminSection: "Admin",
    globalSettings: "Global Settings",
    publicSite: "Public site",
    signOut: "Sign out",
    workspacePreviewBanner:
      "Admin preview — read-only shell. Open CRM for live student and employer records.",
    workspaceImpersonationBanner: "Viewing as {name}.",
    openCrm: "Open CRM",
    exitImpersonation: "Exit view-as",
    viewAsUser: "View as user",
    previewReadonly: "Preview is read-only.",
  };

  adminPageLabels.levers = {
    ...((adminPageLabels.levers as Record<string, string>) || {}),
    eyebrow: "Admin · Program Levers",
    title: "The economics, in one panel.",
    subtitle:
      "Every credit bonus, fee, and track price the platform runs on — editable here, reflected everywhere.",
    pendingTitle: "Pending requests",
    pendingEmpty: "No requests yet.",
    summaryTitle: "Program levers",
    topUpPackagesTitle: "Credit top-up packages",
    waysToEarnTitle: "Ways to earn",
    addRow: "Add row",
    removeRow: "Remove",
    packageLabel: "Label",
    approve: "Approve",
    reject: "Reject",
    save: "Save changes",
    loading: "Loading…",
  };

  adminPageLabels.integrations = {
    ...((adminPageLabels.integrations as Record<string, string>) || {}),
    eyebrow: "Admin · Integrations",
    title: "Connect your stack.",
    subtitle:
      "Every API Venturo talks to, in one place. Connect, rotate keys, and watch sync status.",
    statusConnected: "Connected",
    statusNotConnected: "Not connected",
    neverSynced: "Never synced",
    syncedJustNow: "Synced just now",
    syncedMinutesAgo: "Synced {n} min ago",
    syncedHoursAgo: "Synced {n}h ago",
  };

  adminPageLabels.settings = {
    ...((adminPageLabels.settings as Record<string, string>) || {}),
    workspaceEyebrow: "Admin · Settings",
    settingsTitle: "Workspace settings.",
    workspaceSubtitle: "General configuration for the Venturo workspace.",
    teamMembersTitle: "Team members",
    manageTeam: "Manage team →",
    securityTitle: "Security",
    billingTitle: "Billing",
  };

  adminPageLabels.content = {
    ...((adminPageLabels.content as Record<string, string>) || {}),
    eyebrow: "Admin · Homepage Content",
    title: "Video cards & podcast episodes.",
    subtitle:
      "Everything shown in the public homepage's Stories and Podcast sections is managed here — no code changes needed to add, reorder, or retire an item.",
    library: "Content library",
    libraryTitle: "Content library",
    videos: "Video cards",
    videosTitle: "Video cards",
    podcast: "Podcast episodes",
    podcastTitle: "Podcast episodes",
    addVideo: "+ Add video card",
    addEpisode: "+ Add episode",
    edit: "Edit",
    status_live: "Live",
    status_draft: "Draft",
    liveCount: "live",
    videosTab: "Video cards",
    podcastTab: "Podcast episodes",
    connectTitle: "How this connects to the public site",
    connectBody:
      "Homepage Stories shows the latest synced cards (default 3). Paid student and employer dashboards unlock the fuller private library.",
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
  };

  adminPageLabels.integrations = {
    ...((adminPageLabels.integrations as Record<string, string>) || {}),
    youtubeHint:
      "Connect a YouTube Data API key so Venturo can sync your playlist into homepage Stories and paid portal libraries.",
    youtubeApiKey: "YouTube Data API key",
    youtubeHelp:
      "Create a key in Google Cloud Console → APIs & Services → Credentials, enable YouTube Data API v3, then paste the key here. Playlist URL is set under Admin → Homepage Content.",
  };

  const studentPageLabels = {
    ...((existing.studentPageLabels as Record<string, unknown>) || {}),
  };
  studentPageLabels.dashboard = {
    ...((studentPageLabels.dashboard as Record<string, string>) || {}),
    eyebrow: "Dashboard",
    title: "Your next step starts here.",
    subtitle: "Track your progress, credits, and placement status.",
    creditsLabel: "Credit balance",
    profileCompletenessLabel: "Profile complete",
    stageLabel: "Stage",
    stageEmpty: "Applied",
    creditActivityTitle: "Credit activity, last 8 weeks",
    earnedLegend: "Earned",
    spentLegend: "Spent",
    earnSpendDelta: "{pct}% more earned than spent this month",
    pipelineTitle: "Your placement journey",
    journey_applied: "Applied",
    journey_shortlisted: "Shortlisted",
    journey_interviewing: "Interviewing",
    journey_placed: "Placed",
    recommendedTitle: "Recommended next step",
    redeem: "Redeem",
    unlockedLabel: "Unlocked",
    videosTitle: "Private video materials",
    videosSubtitle:
      "Exclusive route briefings for active Track A and Track B members.",
    videosLocked:
      "Private video materials unlock with an active Track A or Track B subscription.",
    videosUpgradeCta: "Ask your coach or admin to activate your paid track.",
    videosEmpty: "No videos in the library yet.",
    videosWatch: "Watch on YouTube",
  };

  const studentNavLabels = {
    ...((existing.studentNavLabels as Record<string, string>) || {}),
    dashboard: "Dashboard",
    store: "Content Store",
    profile: "My Profile",
    settings: "Settings",
  };

  const employerPageLabels = {
    ...((existing.employerPageLabels as Record<string, unknown>) || {}),
  };
  employerPageLabels.dashboard = {
    ...((employerPageLabels.dashboard as Record<string, string>) || {}),
    videosTitle: "Private video materials",
    videosSubtitle:
      "Exclusive route briefings for active Track A and Track B subscribers.",
    videosLocked:
      "Private video materials unlock with an active Track A or Track B subscription.",
    videosUpgradeCta: "Activate your plan from Profile to watch.",
    videosEmpty: "No videos in the library yet.",
    videosWatch: "Watch on YouTube",
  };
  employerPageLabels.talentPool = {
    ...((employerPageLabels.talentPool as Record<string, string>) || {}),
    eyebrow: "Talent Pool",
    title: "Find your next great hire.",
    subtitle:
      "Every candidate is pre-screened and coached by Venturo. No noise — just quality.",
    statCandidates: "Available",
    statShortlisted: "Shortlisted",
    statInterviewing: "Interviewing",
    searchPlaceholder: "Search by name, skill, or location...",
    viewProfile: "View profile",
    matchScoreLabel: "match",
  };
  employerPageLabels.pipeline = {
    ...((employerPageLabels.pipeline as Record<string, string>) || {}),
    eyebrow: "Pipeline",
    title: "Your hiring in motion.",
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
    activeTitle: "Active candidates",
    emptyState: "No candidates in pipeline yet. Browse the ",
    talentPoolLink: "Talent Pool",
    emptyStateSuffix: "to get started.",
  };

  const employerNavLabels = {
    ...((existing.employerNavLabels as Record<string, string>) || {}),
    talentPool: "Talent Pool",
    pipeline: "Pipeline",
    shortlist: "Shortlist",
    profile: "Our Profile",
    settings: "Settings",
  };

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
      studentPageLabels,
      studentNavLabels,
      employerPageLabels,
      employerNavLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("portal labels patched");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
