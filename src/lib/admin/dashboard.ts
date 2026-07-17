import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";

export interface AdminDashboardStats {
  activeCompanies: number;
  activeStudents: number;
  openJobsCount: number;
  pendingJobsCount: number;
  openPipelineMatches: number;
  pendingRequestsCount: number;
  liveContentItems: number;
  placedThisQuarter: number;
  avgTimeToPlaceDays: number | null;
  trackACompanies: number;
  trackBCompanies: number;
  monthlyActiveStudents: number[];
  monthlyPlaced: number[];
  monthLabels: string[];
  degraded?: boolean;
}

function quarterStart(date = new Date()): Date {
  const month = date.getUTCMonth();
  const quarterMonth = month - (month % 3);
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1));
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const [
      activeCompaniesSnap,
      activeStudentsSnap,
      openJobsSnap,
      pendingJobsSnap,
      pendingRequestsSnap,
      newApplicationsSnap,
      newInterestSnap,
      liveContentSnap,
      stagesSnap,
      matchesSnap,
      companiesSnap,
    ] = await Promise.all([
      adminDb
        .collection("companies")
        .where("subscriptionStatus", "==", "active")
        .count()
        .get(),
      adminDb.collection("students").where("status", "==", "active").count().get(),
      adminDb.collection("job_postings").where("status", "==", "open").count().get(),
      adminDb
        .collection("job_postings")
        .where("status", "==", "pending")
        .count()
        .get(),
      adminDb.collection("requests").where("status", "==", "pending").count().get(),
      adminDb.collection("job_applications").where("status", "==", "new").count().get(),
      adminDb
        .collection("role_interest_submissions")
        .where("status", "==", "new")
        .count()
        .get(),
      adminDb.collection("content_items").where("status", "==", "live").count().get(),
      adminDb.collection("pipeline_stages").get(),
      adminDb.collection("matches").get(),
      adminDb.collection("companies").get(),
    ]);

    let trackACompanies = 0;
    let trackBCompanies = 0;
    for (const doc of companiesSnap.docs) {
      const plan = String(doc.data().plan ?? "");
      if (plan === "track_a") trackACompanies += 1;
      if (plan === "track_b") trackBCompanies += 1;
    }

    const monthLabels: string[] = [];
    const monthlyActiveStudents: number[] = [];
    const monthlyPlaced: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthLabels.push(
        d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      );
      monthlyActiveStudents.push(0);
      monthlyPlaced.push(0);
    }

    const terminalStageIds = new Set(
      stagesSnap.docs
        .filter((doc) => Boolean(doc.data().isTerminal))
        .map((doc) => doc.id),
    );
    if (terminalStageIds.size === 0) {
      terminalStageIds.add("pipeline_placed");
    }

    const start = quarterStart();
    let placedThisQuarter = 0;
    let openPipelineMatches = 0;
    const placeDurations: number[] = [];

    for (const doc of matchesSnap.docs) {
      const data = doc.data();
      const stageId = String(data.stageId ?? "");
      const isTerminal = terminalStageIds.has(stageId);
      if (!isTerminal) {
        openPipelineMatches += 1;
      }
      const updatedAt = toDate(data.updatedAt) ?? toDate(data.createdAt);
      const createdAt = toDate(data.createdAt);

      if (updatedAt) {
        const idx =
          (updatedAt.getUTCFullYear() - now.getUTCFullYear()) * 12 +
          (updatedAt.getUTCMonth() - now.getUTCMonth()) +
          5;
        if (idx >= 0 && idx < 6) {
          monthlyActiveStudents[idx] = (monthlyActiveStudents[idx] ?? 0) + 1;
          if (isTerminal) {
            monthlyPlaced[idx] = (monthlyPlaced[idx] ?? 0) + 1;
          }
        }
      }

      if (!isTerminal) {
        continue;
      }

      if (updatedAt && updatedAt >= start) {
        placedThisQuarter += 1;
      }

      if (createdAt && updatedAt) {
        const days =
          (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) {
          placeDurations.push(days);
        }
      }
    }

    const avgTimeToPlaceDays =
      placeDurations.length > 0
        ? Math.round(
            (placeDurations.reduce((sum, value) => sum + value, 0) /
              placeDurations.length) *
              10,
          ) / 10
        : null;

    return {
      activeCompanies: activeCompaniesSnap.data().count,
      activeStudents: activeStudentsSnap.data().count,
      openJobsCount: openJobsSnap.data().count,
      pendingJobsCount: pendingJobsSnap.data().count,
      openPipelineMatches,
      pendingRequestsCount:
        pendingRequestsSnap.data().count +
        newApplicationsSnap.data().count +
        newInterestSnap.data().count,
      liveContentItems: liveContentSnap.data().count,
      placedThisQuarter,
      avgTimeToPlaceDays,
      trackACompanies,
      trackBCompanies,
      monthlyActiveStudents,
      monthlyPlaced,
      monthLabels,
    };
  } catch {
    return {
      activeCompanies: 0,
      activeStudents: 0,
      openJobsCount: 0,
      pendingJobsCount: 0,
      openPipelineMatches: 0,
      pendingRequestsCount: 0,
      liveContentItems: 0,
      placedThisQuarter: 0,
      avgTimeToPlaceDays: null,
      trackACompanies: 0,
      trackBCompanies: 0,
      monthlyActiveStudents: [0, 0, 0, 0, 0, 0],
      monthlyPlaced: [0, 0, 0, 0, 0, 0],
      monthLabels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      degraded: true,
    };
  }
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
}

export async function getRecentActivity(limit = 20): Promise<ActivityLogEntry[]> {
  try {
    const snapshot = await adminDb
      .collection("activity_log")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        actorId: data.actorId ?? "",
        actorRole: data.actorRole ?? "",
        action: data.action ?? "",
        targetType: data.targetType ?? "",
        targetId: data.targetId ?? "",
        metadata: data.metadata ?? {},
        createdAt: serializeTimestamp(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}

export type PendingRequestSource =
  | "requests"
  | "job_applications"
  | "role_interest_submissions";

export interface PendingRequestItem {
  id: string;
  source: PendingRequestSource;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string | null;
  payload: Record<string, unknown>;
}

export async function getPendingRequests(): Promise<PendingRequestItem[]> {
  try {
    const [requestsSnap, applicationsSnap, interestSnap] = await Promise.all([
      adminDb.collection("requests").where("status", "==", "pending").get(),
      adminDb.collection("job_applications").where("status", "==", "new").get(),
      adminDb
        .collection("role_interest_submissions")
        .where("status", "==", "new")
        .get(),
    ]);

    const items: PendingRequestItem[] = [];

    for (const doc of requestsSnap.docs) {
      const data = doc.data();
      const payload = (data.payload ?? {}) as Record<string, unknown>;
      const type = String(data.type ?? "");
      let title = String(payload.roleTitleNeeded ?? payload.type ?? type ?? doc.id);
      let subtitle = String(payload.companyName ?? payload.contactName ?? type ?? "");

      if (type === "plan_request") {
        title = `Plan → ${String(payload.requestedPlan ?? "")}`;
        subtitle = String(payload.companyName ?? payload.contactEmail ?? "");
      }
      if (type === "credit_topup") {
        title = `Top-up · ${String(payload.label ?? "")}`;
        subtitle = String(payload.studentEmail ?? payload.studentName ?? "");
      }
      if (type === "placement_fee") {
        title = `Placement fee · €${String(payload.placementFeeEur ?? "")}`;
        subtitle = String(payload.companyName ?? payload.studentId ?? "");
      }

      items.push({
        id: doc.id,
        source: "requests",
        title,
        subtitle,
        status: data.status ?? "pending",
        createdAt: serializeTimestamp(data.createdAt),
        payload,
      });
    }

    for (const doc of applicationsSnap.docs) {
      const data = doc.data();
      items.push({
        id: doc.id,
        source: "job_applications",
        title: data.fullName ?? doc.id,
        subtitle: data.email ?? "",
        status: data.status ?? "new",
        createdAt: serializeTimestamp(data.createdAt),
        payload: { ...data, id: doc.id },
      });
    }

    for (const doc of interestSnap.docs) {
      const data = doc.data();
      items.push({
        id: doc.id,
        source: "role_interest_submissions",
        title: data.fullName ?? doc.id,
        subtitle: data.email ?? "",
        status: data.status ?? "new",
        createdAt: serializeTimestamp(data.createdAt),
        payload: { ...data, id: doc.id },
      });
    }

    return items.sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
  } catch {
    return [];
  }
}
