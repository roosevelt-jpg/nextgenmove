import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { revalidateAdminCollection } from "@/lib/admin/revalidate";
import { getHostingCatalog } from "@/lib/billing/hosting-catalog";
import type { HostingSubscriptionStatus } from "@/lib/billing/hosting-catalog-shared";
import { stripUndefined } from "@/lib/stripUndefined";

export type { HostingSubscriptionStatus };

function parseSubscription(
  raw: Record<string, unknown> | undefined,
): HostingSubscriptionStatus {
  if (!raw || typeof raw !== "object") {
    return {
      status: "inactive",
      planId: null,
      planName: null,
      periodId: null,
      orderId: null,
      activatedAt: null,
      expiresAt: null,
    };
  }

  const statusRaw = String(raw.status ?? "inactive");
  let status: HostingSubscriptionStatus["status"] =
    statusRaw === "active" || statusRaw === "pending" ? statusRaw : "inactive";

  const expiresAt = raw.expiresAt == null ? null : String(raw.expiresAt);
  // Treat expired subscriptions as inactive for UI + payment guards.
  if (
    status === "active" &&
    expiresAt &&
    !Number.isNaN(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) < Date.now()
  ) {
    status = "inactive";
  }

  return {
    status,
    planId: raw.planId == null ? null : String(raw.planId),
    planName: raw.planName == null ? null : String(raw.planName),
    periodId: raw.periodId == null ? null : String(raw.periodId),
    orderId: raw.orderId == null ? null : String(raw.orderId),
    activatedAt: raw.activatedAt == null ? null : String(raw.activatedAt),
    expiresAt,
  };
}

export function isHostingPaid(
  subscription: HostingSubscriptionStatus | null | undefined,
): boolean {
  return subscription?.status === "active";
}

function addMonthsIso(from: Date, months: number): string {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next.toISOString();
}

/**
 * If payment succeeded but hostingSubscription was never written (webhook/confirm
 * race), restore Active from the latest paid hosting_orders doc.
 */
async function healHostingSubscriptionFromPaidOrder(): Promise<HostingSubscriptionStatus | null> {
  try {
    const ordersSnap = await adminDb
      .collection("hosting_orders")
      .where("status", "==", "paid")
      .limit(25)
      .get();
    if (ordersSnap.empty) return null;

    const paid = ordersSnap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
      .sort((a, b) => {
        const toMs = (value: unknown): number => {
          if (
            value &&
            typeof value === "object" &&
            "toMillis" in value &&
            typeof (value as { toMillis?: unknown }).toMillis === "function"
          ) {
            return (value as { toMillis: () => number }).toMillis();
          }
          if (typeof value === "string" || typeof value === "number") {
            const ms = Date.parse(String(value));
            return Number.isFinite(ms) ? ms : 0;
          }
          return 0;
        };
        return (
          toMs(b.data.paidAt ?? b.data.updatedAt ?? b.data.createdAt) -
          toMs(a.data.paidAt ?? a.data.updatedAt ?? a.data.createdAt)
        );
      })[0];
    if (!paid) return null;

    const months = Number(paid.data.months ?? 12);
    const activatedAt = new Date();
    const expiresAt = addMonthsIso(
      activatedAt,
      Number.isFinite(months) && months > 0 ? months : 12,
    );
    const planId =
      paid.data.planId == null ? null : String(paid.data.planId);
    const planName =
      paid.data.planName == null ? null : String(paid.data.planName);
    const periodId =
      paid.data.periodId == null ? null : String(paid.data.periodId);

    await adminDb.collection("site_settings").doc("default").set(
      stripUndefined({
        hostingSubscription: {
          status: "active",
          planId,
          planName,
          periodId,
          orderId: paid.id,
          months: Number.isFinite(months) ? months : 12,
          activatedAt: activatedAt.toISOString(),
          expiresAt,
          paymentIntentId:
            paid.data.stripePaymentIntentId == null
              ? null
              : String(paid.data.stripePaymentIntentId),
        },
        operatorPlanLabel: planName
          ? `Hosting Active · ${planName}`
          : "Hosting Active",
        operatorPlanDetail: `Hostinger agency hosting through ${expiresAt.slice(0, 10)}`,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    revalidateAdminCollection("site_settings");

    return {
      status: "active",
      planId,
      planName,
      periodId,
      orderId: paid.id,
      activatedAt: activatedAt.toISOString(),
      expiresAt,
    };
  } catch {
    return null;
  }
}

export async function getHostingSubscription(): Promise<HostingSubscriptionStatus> {
  try {
    const snap = await adminDb.collection("site_settings").doc("default").get();
    const raw = snap.data()?.hostingSubscription as
      | Record<string, unknown>
      | undefined;
    const current = parseSubscription(raw);
    if (current.status === "active") return current;

    const healed = await healHostingSubscriptionFromPaidOrder();
    if (healed) return healed;
    return current;
  } catch {
    return {
      status: "inactive",
      planId: null,
      planName: null,
      periodId: null,
      orderId: null,
      activatedAt: null,
      expiresAt: null,
    };
  }
}

/**
 * Marks a hosting order paid and sets site_settings.hostingSubscription to active
 * so nextgenmove.agency (Admin Hosting + Billing) shows Hosting Active.
 */
export async function activateHostingFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
): Promise<{ orderId: string; alreadyPaid: boolean } | null> {
  const orderId = paymentIntent.metadata?.orderId?.trim();
  if (!orderId) return null;

  if (
    paymentIntent.status !== "succeeded" &&
    paymentIntent.status !== "processing"
  ) {
    return null;
  }

  const ref = adminDb.collection("hosting_orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const order = snap.data() as Record<string, unknown>;
  const alreadyPaid = String(order.status ?? "") === "paid";

  const planId =
    String(paymentIntent.metadata?.planId ?? order.planId ?? "").trim() ||
    null;
  const periodId =
    String(paymentIntent.metadata?.periodId ?? order.periodId ?? "").trim() ||
    null;
  const months = Number(
    paymentIntent.metadata?.months ?? order.months ?? 12,
  );
  const catalog = await getHostingCatalog();
  const plan = catalog.plans.find((item) => item.id === planId);
  const planName =
    plan?.name ||
    (order.planName == null ? null : String(order.planName)) ||
    planId;
  const activatedAt = new Date();
  const expiresAt = addMonthsIso(
    activatedAt,
    Number.isFinite(months) && months > 0 ? months : 12,
  );

  if (!alreadyPaid) {
    await ref.set(
      stripUndefined({
        status: "paid",
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId:
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id ?? null,
      }),
      { merge: true },
    );
  }

  await adminDb.collection("site_settings").doc("default").set(
    stripUndefined({
      hostingSubscription: {
        status: "active",
        planId,
        planName,
        periodId,
        orderId,
        months: Number.isFinite(months) ? months : 12,
        activatedAt: activatedAt.toISOString(),
        expiresAt,
        paymentIntentId: paymentIntent.id,
      },
      // Surface on Admin → Settings → Billing
      operatorPlanLabel: planName
        ? `Hosting Active · ${planName}`
        : "Hosting Active",
      operatorPlanDetail: `Hostinger agency hosting through ${expiresAt.slice(0, 10)}`,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  revalidateAdminCollection("site_settings");

  return { orderId, alreadyPaid };
}
