import { NextResponse } from "next/server";
import { getCurrentUser, getSessionActor } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/async/with-timeout";
import type { PortalSessionMode } from "@/lib/auth/portal-session";
import {
  assertCompanyOwnsResource,
  TenantBoundaryError,
} from "@/lib/security/tenant-boundary";
import type { CurrentUser } from "@/types/user";

export interface CompanyDocument {
  id: string;
  userId: string;
  name: string;
  contactEmail: string;
  contactPhone?: string | null;
  nationality?: string | null;
  logoUrl: string | null;
  industry: string;
  website: string | null;
  plan: "track_a" | "track_b" | null;
  subscriptionStatus: "active" | "inactive" | "pending";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  billingProvider?: string | null;
  contactName?: string | null;
  hiringNeeds?: string | null;
  requirements: CompanyRequirement[];
  preferredLocations?: string[];
  requirementTags?: string[];
  notificationPreferences?: Record<string, boolean>;
  createdAt: unknown;
}

export interface CompanyRequirement {
  id: string;
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface EmployerSession {
  user: CurrentUser;
  companyId: string;
  company: CompanyDocument;
  mode: PortalSessionMode;
}

function emptyPreviewCompany(user: CurrentUser): CompanyDocument {
  return {
    id: user.uid,
    userId: user.uid,
    name: user.displayName || "Admin preview",
    contactEmail: user.email ?? "",
    contactPhone: null,
    nationality: null,
    logoUrl: user.photoUrl,
    industry: "",
    website: null,
    plan: null,
    subscriptionStatus: "pending",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    billingProvider: null,
    contactName: user.displayName || null,
    hiringNeeds: null,
    requirements: [],
    preferredLocations: [],
    requirementTags: [],
    notificationPreferences: {},
    createdAt: null,
  };
}

export async function getEmployerSession(): Promise<EmployerSession | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.role === "company") {
    try {
      const companySnapshot = await withTimeout(
        adminDb.collection("companies").doc(user.uid).get(),
        3500,
        "employer_session_lookup",
      );

      if (!companySnapshot.exists) {
        return null;
      }

      const data = companySnapshot.data()!;
      const mode: PortalSessionMode =
        user.sessionMode === "impersonation" ? "impersonation" : "live";

      return {
        user,
        companyId: companySnapshot.id,
        company: {
          id: companySnapshot.id,
          userId: data.userId ?? user.uid,
          name: data.name ?? "",
          contactEmail: data.contactEmail ?? "",
          contactPhone: data.contactPhone ?? null,
          nationality: data.nationality ?? null,
          logoUrl: data.logoUrl ?? null,
          industry: data.industry ?? "",
          website: data.website ?? null,
          plan: data.plan ?? null,
          subscriptionStatus: data.subscriptionStatus ?? "pending",
          stripeCustomerId: data.stripeCustomerId ?? null,
          stripeSubscriptionId: data.stripeSubscriptionId ?? null,
          billingProvider: data.billingProvider ?? null,
          contactName: data.contactName ?? null,
          hiringNeeds: data.hiringNeeds ?? null,
          requirements: data.requirements ?? [],
          preferredLocations: data.preferredLocations ?? [],
          requirementTags: data.requirementTags ?? [],
          notificationPreferences: data.notificationPreferences ?? {},
          createdAt: data.createdAt,
        },
        mode,
      };
    } catch {
      return null;
    }
  }

  if (user.role === "admin") {
    const actor = await getSessionActor();
    if (!actor || actor.role !== "admin") {
      return null;
    }

    return {
      user: {
        ...user,
        sessionMode: "preview",
      },
      companyId: actor.uid,
      company: emptyPreviewCompany(actor),
      mode: "preview",
    };
  }

  return null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function verifyMatchOwnership(
  matchId: string,
  companyId: string,
): Promise<(Record<string, unknown> & { id: string }) | null> {
  const matchSnapshot = await adminDb.collection("matches").doc(matchId).get();

  if (!matchSnapshot.exists) {
    return null;
  }

  const data = matchSnapshot.data()!;

  try {
    assertCompanyOwnsResource(String(data.companyId ?? ""), companyId);
  } catch (error) {
    if (error instanceof TenantBoundaryError) {
      return null;
    }
    throw error;
  }

  return { id: matchSnapshot.id, ...data };
}
