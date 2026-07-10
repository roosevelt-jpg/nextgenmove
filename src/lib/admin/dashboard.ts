import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";

export interface AdminDashboardStats {
  activeCompanies: number;
  activeStudents: number;
  openPipelineMatches: number;
  pendingRequestsCount: number;
  liveContentItems: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const [
      activeCompaniesSnap,
      activeStudentsSnap,
      openMatchesSnap,
      pendingRequestsSnap,
      newApplicationsSnap,
      newInterestSnap,
      liveContentSnap,
    ] = await Promise.all([
      adminDb
        .collection("companies")
        .where("subscriptionStatus", "==", "active")
        .count()
        .get(),
      adminDb.collection("students").where("status", "==", "active").count().get(),
      adminDb.collection("matches").count().get(),
      adminDb.collection("requests").where("status", "==", "pending").count().get(),
      adminDb.collection("job_applications").where("status", "==", "new").count().get(),
      adminDb
        .collection("role_interest_submissions")
        .where("status", "==", "new")
        .count()
        .get(),
      adminDb.collection("content_items").where("status", "==", "live").count().get(),
    ]);

    return {
      activeCompanies: activeCompaniesSnap.data().count,
      activeStudents: activeStudentsSnap.data().count,
      openPipelineMatches: openMatchesSnap.data().count,
      pendingRequestsCount:
        pendingRequestsSnap.data().count +
        newApplicationsSnap.data().count +
        newInterestSnap.data().count,
      liveContentItems: liveContentSnap.data().count,
    };
  } catch {
    return {
      activeCompanies: 0,
      activeStudents: 0,
      openPipelineMatches: 0,
      pendingRequestsCount: 0,
      liveContentItems: 0,
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
      items.push({
        id: doc.id,
        source: "requests",
        title: String(payload.roleTitleNeeded ?? payload.type ?? data.type ?? doc.id),
        subtitle: String(payload.companyName ?? payload.contactName ?? data.type ?? ""),
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
