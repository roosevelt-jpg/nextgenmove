import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import { getProgramLevers } from "@/lib/collections/pages";

export type CrmDealStage = "new" | "contacted" | "qualified" | "won";

export interface CrmContactRow {
  id: string;
  name: string;
  type: "company" | "candidate" | "lead";
  stage: string;
  owner: string;
  lastActivity: string | null;
  value: string;
  sourceId?: string;
  sourceCollection?: string;
}

function defaultDealStage(data: FirebaseFirestore.DocumentData): CrmDealStage {
  const explicit = data.crmDealStage as CrmDealStage | undefined;
  if (
    explicit === "new" ||
    explicit === "contacted" ||
    explicit === "qualified" ||
    explicit === "won"
  ) {
    return explicit;
  }
  if (data.subscriptionStatus === "active") return "won";
  if (data.subscriptionStatus === "pending") return "new";
  return "contacted";
}

function formatValue(
  plan: string | null | undefined,
  levers: { trackAMonthly: number; trackBMonthly: number },
  labels: { monthlySuffix?: string },
): string {
  if (plan === "track_a") {
    return `€${levers.trackAMonthly}${labels.monthlySuffix ?? "/mo"}`;
  }
  if (plan === "track_b") {
    return `€${levers.trackBMonthly}${labels.monthlySuffix ?? "/mo"}`;
  }
  return "—";
}

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const [companiesSnap, studentsSnap, appsSnap, interestSnap, requestsSnap, levers] =
      await Promise.all([
        adminDb.collection("companies").get(),
        adminDb.collection("students").get(),
        adminDb.collection("job_applications").get(),
        adminDb.collection("role_interest_submissions").get(),
        adminDb.collection("requests").where("status", "==", "pending").get(),
        getProgramLevers(),
      ]);

    const leverValues = {
      trackAMonthly: levers?.trackAMonthly ?? 0,
      trackBMonthly: levers?.trackBMonthly ?? 0,
    };

    const contacts: CrmContactRow[] = [];
    const deals: Record<CrmDealStage, CrmContactRow[]> = {
      new: [],
      contacted: [],
      qualified: [],
      won: [],
    };

    let activeCompanies = 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let newLeads7d = 0;

    for (const doc of companiesSnap.docs) {
      const data = doc.data();
      const stage = defaultDealStage(data);
      const createdAt = data.createdAt?.toDate?.()?.getTime?.() ?? 0;
      if (data.subscriptionStatus === "active") activeCompanies += 1;
      if (createdAt >= weekAgo) newLeads7d += 1;

      const row: CrmContactRow = {
        id: doc.id,
        name: String(data.name ?? doc.id),
        type: "company",
        stage,
        owner: String(data.crmOwner ?? ""),
        lastActivity:
          serializeTimestamp(data.updatedAt ?? data.createdAt) ?? null,
        value: formatValue(data.plan, leverValues, {}),
        sourceId: doc.id,
        sourceCollection: "companies",
      };
      contacts.push(row);
      deals[stage].push(row);
    }

    for (const doc of studentsSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.()?.getTime?.() ?? 0;
      if (createdAt >= weekAgo) newLeads7d += 1;

      contacts.push({
        id: doc.id,
        name: String(data.fullName ?? doc.id),
        type: "candidate",
        stage: String(data.status ?? "active"),
        owner: String(data.crmOwner ?? ""),
        lastActivity:
          serializeTimestamp(data.updatedAt ?? data.createdAt) ?? null,
        value: "—",
        sourceId: doc.id,
        sourceCollection: "students",
      });
    }

    for (const doc of appsSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.()?.getTime?.() ?? 0;
      if (createdAt >= weekAgo) newLeads7d += 1;

      contacts.push({
        id: `app_${doc.id}`,
        name: String(data.fullName ?? doc.id),
        type: "lead",
        stage: String(data.status ?? "new"),
        owner: "",
        lastActivity: serializeTimestamp(data.createdAt) ?? null,
        value: "—",
        sourceId: doc.id,
        sourceCollection: "job_applications",
      });
    }

    for (const doc of interestSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.()?.getTime?.() ?? 0;
      if (createdAt >= weekAgo) newLeads7d += 1;

      contacts.push({
        id: `interest_${doc.id}`,
        name: String(data.fullName ?? data.email ?? doc.id),
        type: "lead",
        stage: String(data.status ?? "new"),
        owner: "",
        lastActivity: serializeTimestamp(data.createdAt) ?? null,
        value: "—",
        sourceId: doc.id,
        sourceCollection: "role_interest_submissions",
      });
    }

    for (const doc of requestsSnap.docs) {
      const data = doc.data();
      const payload = (data.payload ?? {}) as Record<string, unknown>;
      contacts.push({
        id: `req_${doc.id}`,
        name: String(payload.companyName ?? data.type ?? doc.id),
        type: "lead",
        stage: "new",
        owner: "",
        lastActivity: serializeTimestamp(data.createdAt) ?? null,
        value: "—",
        sourceId: doc.id,
        sourceCollection: "requests",
      });
    }

    const openDeals =
      deals.new.length + deals.contacted.length + deals.qualified.length;

    return NextResponse.json({
      stats: {
        totalContacts: contacts.length,
        openDeals,
        activeCompanies,
        newLeads7d,
      },
      deals,
      contacts,
    });
  } catch (error) {
    console.error("crm_overview_failed", error);
    return NextResponse.json({
      stats: {
        totalContacts: 0,
        openDeals: 0,
        activeCompanies: 0,
        newLeads7d: 0,
      },
      deals: { new: [], contacted: [], qualified: [], won: [] },
      contacts: [],
    });
  }
}
