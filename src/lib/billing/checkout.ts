import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta } from "@/lib/credits/ledger";
import { stripUndefined } from "@/lib/stripUndefined";
import { logger } from "@/lib/observability/logger";
import {
  appBaseUrl,
  eurosToCents,
  getStripeClient,
} from "@/lib/billing/stripe";
import { getProgramLevers } from "@/lib/collections/pages";

export type EmployerPlan = "track_a" | "track_b";

export async function createEmployerSubscriptionCheckout(options: {
  companyId: string;
  companyName: string;
  contactEmail: string;
  plan: EmployerPlan;
  stripeCustomerId?: string | null;
  request: Request;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = await getStripeClient();
  const levers = await getProgramLevers();
  if (!levers) {
    throw new Error("program_levers_missing");
  }

  const amountEur =
    options.plan === "track_a" ? levers.trackAMonthly : levers.trackBMonthly;
  const productName =
    options.plan === "track_a"
      ? "Venturo Track A"
      : "Venturo Track B";

  const base = appBaseUrl(options.request);

  let customerId = options.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: options.contactEmail,
      name: options.companyName,
      metadata: { companyId: options.companyId },
    });
    customerId = customer.id;
    await adminDb
      .collection("companies")
      .doc(options.companyId)
      .update(stripUndefined({ stripeCustomerId: customerId }));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: options.companyId,
    success_url: `${base}/employer/profile?billing=success`,
    cancel_url: `${base}/employer/profile?billing=cancelled`,
    metadata: {
      kind: "employer_plan",
      companyId: options.companyId,
      plan: options.plan,
    },
    subscription_data: {
      metadata: {
        companyId: options.companyId,
        plan: options.plan,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: eurosToCents(amountEur),
          recurring: { interval: "month" },
          product_data: {
            name: productName,
            metadata: { plan: options.plan },
          },
        },
      },
    ],
    // Auto-debit: collect a card and charge it each billing cycle
    payment_method_collection: "always",
    payment_method_types: ["card"],
  });

  if (!session.url) {
    throw new Error("checkout_url_missing");
  }

  return { url: session.url, sessionId: session.id };
}

export async function createCreditTopUpCheckout(options: {
  studentId: string;
  studentEmail: string;
  studentName: string;
  packageId: string;
  credits: number;
  priceEur: number;
  label: string;
  request: Request;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = await getStripeClient();
  const base = appBaseUrl(options.request);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: options.studentEmail,
    client_reference_id: options.studentId,
    success_url: `${base}/student/wallet?topup=success`,
    cancel_url: `${base}/student/wallet?topup=cancelled`,
    metadata: {
      kind: "credit_topup",
      studentId: options.studentId,
      packageId: options.packageId,
      credits: String(options.credits),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: eurosToCents(options.priceEur),
          product_data: {
            name: options.label,
            metadata: { packageId: options.packageId },
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new Error("checkout_url_missing");
  }

  return { url: session.url, sessionId: session.id };
}

export async function createBillingPortalSession(options: {
  stripeCustomerId: string;
  request: Request;
}): Promise<string> {
  const stripe = await getStripeClient();
  const base = appBaseUrl(options.request);
  const session = await stripe.billingPortal.sessions.create({
    customer: options.stripeCustomerId,
    return_url: `${base}/employer/profile`,
  });
  return session.url;
}

export async function markWebhookProcessed(eventId: string): Promise<boolean> {
  const ref = adminDb.collection("stripe_webhook_events").doc(eventId);
  const existing = await ref.get();
  if (existing.exists) {
    return false;
  }
  await ref.set(
    stripUndefined({
      id: eventId,
      processedAt: FieldValue.serverTimestamp(),
    }),
  );
  return true;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const shouldProcess = await markWebhookProcessed(event.id);
  if (!shouldProcess) {
    logger.info("stripe_webhook_duplicate", { eventId: event.id });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoiceFailed(invoice);
      break;
    }
    default:
      logger.info("stripe_webhook_ignored", { type: event.type });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const kind = session.metadata?.kind;

  if (kind === "employer_plan") {
    const companyId = session.metadata?.companyId;
    const plan = session.metadata?.plan as EmployerPlan | undefined;
    if (!companyId || (plan !== "track_a" && plan !== "track_b")) {
      return;
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    await adminDb
      .collection("companies")
      .doc(companyId)
      .update(
        stripUndefined({
          plan,
          subscriptionStatus: "active",
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          billingProvider: "stripe",
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

    logger.info("stripe_employer_plan_activated", { companyId, plan });
    const { notifyPlanActivated } = await import("@/lib/email/notify");
    void notifyPlanActivated({
      companyId,
      planLabel: plan === "track_a" ? "Track A" : "Track B",
    });
    return;
  }

  if (kind === "credit_topup") {
    const studentId = session.metadata?.studentId;
    const credits = Number(session.metadata?.credits ?? 0);
    const packageId = session.metadata?.packageId ?? "unknown";
    if (!studentId || !credits) return;

    const grant = await applyCreditDelta({
      studentId,
      amount: credits,
      source: `stripe_topup:${session.id}`,
      once: true,
    });

    if (grant.applied) {
      const { notifyTopUpSuccessful } = await import("@/lib/email/notify");
      void notifyTopUpSuccessful({
        studentId,
        credits,
        balance: grant.credits,
        packageLabel: packageId,
      });
    }

    logger.info("stripe_credit_topup_applied", {
      studentId,
      credits,
      packageId,
      sessionId: session.id,
    });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) return;

  const status = subscription.status;
  const subscriptionStatus =
    status === "active" || status === "trialing"
      ? "active"
      : status === "past_due"
        ? "pending"
        : "inactive";

  const plan = subscription.metadata?.plan;
  await adminDb
    .collection("companies")
    .doc(companyId)
    .update(
      stripUndefined({
        subscriptionStatus,
        stripeSubscriptionId: subscription.id,
        plan:
          plan === "track_a" || plan === "track_b" ? plan : undefined,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const companies = await adminDb
    .collection("companies")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  const company = companies.docs[0];
  if (!company) return;

  await company.ref.update(
    stripUndefined({
      subscriptionStatus: "pending",
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const { notifyPaymentFailed } = await import("@/lib/email/notify");
  void notifyPaymentFailed({ companyId: company.id });
}
