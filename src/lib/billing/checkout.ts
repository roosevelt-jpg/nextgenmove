import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { applyCreditDelta } from "@/lib/credits/ledger";
import { applyCompanyCreditDelta } from "@/lib/move-os/escrow";
import { stripUndefined } from "@/lib/stripUndefined";
import { logger } from "@/lib/observability/logger";
import {
  appBaseUrl,
  eurosToCents,
  getStripeClient,
} from "@/lib/billing/stripe";
import { getProgramLevers } from "@/lib/collections/pages";
import { convertToMinorUnitsSafe } from "@/lib/public/fx";
import {
  normalizeCurrencyCode,
} from "@/lib/public/currency";
import { getSiteSettings } from "@/lib/collections/site-settings";

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
      ? "Nextgenmove Track A"
      : "Nextgenmove Track B";

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

  const settings = await getSiteSettings();
  const displayCurrency = normalizeCurrencyCode(settings.defaultCurrency);
  const converted = await convertToMinorUnitsSafe(
    amountEur,
    "EUR",
    displayCurrency,
  );
  const currency = converted.currency;
  const unitAmount =
    currency === "eur" ? eurosToCents(amountEur) : converted.amountMinor;

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
      priceEur: String(amountEur),
      fxRate: converted.fxRate != null ? String(converted.fxRate) : "",
      fxDate: converted.fxDate ?? "",
      fxFrom: "EUR",
      fxTo: currency.toUpperCase(),
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
          currency,
          unit_amount: unitAmount,
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

export async function createCompanyCreditTopUpCheckout(options: {
  companyId: string;
  companyEmail?: string;
  companyName: string;
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
    ...(options.companyEmail
      ? { customer_email: options.companyEmail }
      : {}),
    client_reference_id: options.companyId,
    success_url: `${base}/employer/bench?credits=success`,
    cancel_url: `${base}/employer/bench?credits=cancelled`,
    metadata: {
      kind: "company_credit_topup",
      companyId: options.companyId,
      packageId: options.packageId,
      creditAmount: String(options.credits),
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
            metadata: {
              packageId: options.packageId,
              companyId: options.companyId,
            },
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

/**
 * Inline Payment Element path — creates a PaymentIntent with client_secret.
 * Charges in site display currency when FX is available; otherwise EUR.
 * Stores fxRate on metadata when conversion ran.
 */
export async function createCreditTopUpPaymentIntent(options: {
  studentId: string;
  studentEmail: string;
  packageId: string;
  credits: number;
  priceEur: number;
  label: string;
}): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amountMinor: number;
  currency: string;
  fxRate: number | null;
  fxDate: string | null;
}> {
  const stripe = await getStripeClient();
  const settings = await getSiteSettings();
  const displayCurrency = normalizeCurrencyCode(settings.defaultCurrency);

  const converted = await convertToMinorUnitsSafe(
    options.priceEur,
    "EUR",
    displayCurrency,
  );

  // Prefer converted display currency; if FX failed we already fell back to EUR.
  const currency = converted.currency;
  const amountMinor =
    currency === "eur"
      ? eurosToCents(options.priceEur)
      : converted.amountMinor;

  const intent = await stripe.paymentIntents.create({
    amount: amountMinor,
    currency,
    automatic_payment_methods: { enabled: true },
    receipt_email: options.studentEmail || undefined,
    description: options.label,
    metadata: {
      kind: "credit_topup",
      studentId: options.studentId,
      packageId: options.packageId,
      credits: String(options.credits),
      priceEur: String(options.priceEur),
      fxRate: converted.fxRate != null ? String(converted.fxRate) : "",
      fxDate: converted.fxDate ?? "",
      fxFrom: "EUR",
      fxTo: currency.toUpperCase(),
    },
  });

  if (!intent.client_secret) {
    throw new Error("payment_intent_secret_missing");
  }

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amountMinor,
    currency,
    fxRate: converted.fxRate,
    fxDate: converted.fxDate,
  };
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
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentSucceeded(intent);
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
    return;
  }

  if (kind === "company_credit_topup") {
    const companyId = session.metadata?.companyId;
    const creditAmount = Number(
      session.metadata?.creditAmount ?? session.metadata?.credits ?? 0,
    );
    const packageId = session.metadata?.packageId ?? "unknown";
    if (!companyId || !creditAmount) return;

    const grant = await applyCompanyCreditDelta({
      companyId,
      amount: creditAmount,
      source: `stripe_company_topup:${session.id}`,
      once: true,
      ledgerId: `stripe_company_topup_${session.id}`,
      meta: { packageId, creditAmount },
    });

    if (grant.applied) {
      const { createNotification } = await import("@/lib/notifications/create");
      void createNotification({
        userId: companyId,
        type: "activity",
        title: "Company credits added",
        body: `${creditAmount} commit credits added. Balance: ${grant.credits}.`,
        link: "/employer/bench",
      });
    }

    logger.info("stripe_company_credit_topup_applied", {
      companyId,
      creditAmount,
      packageId,
      sessionId: session.id,
      applied: grant.applied,
    });
  }
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const kind = intent.metadata?.kind;
  if (kind === "company_credit_topup") {
    const companyId = intent.metadata?.companyId;
    const creditAmount = Number(
      intent.metadata?.creditAmount ?? intent.metadata?.credits ?? 0,
    );
    const packageId = intent.metadata?.packageId ?? "unknown";
    if (!companyId || !creditAmount) return;

    const grant = await applyCompanyCreditDelta({
      companyId,
      amount: creditAmount,
      source: `stripe_company_topup:${intent.id}`,
      once: true,
      ledgerId: `stripe_company_topup_${intent.id}`,
      meta: { packageId, creditAmount },
    });

    logger.info("stripe_company_credit_topup_pi_applied", {
      companyId,
      creditAmount,
      packageId,
      paymentIntentId: intent.id,
      applied: grant.applied,
    });
    return;
  }

  if (kind !== "credit_topup") return;

  const studentId = intent.metadata?.studentId;
  const credits = Number(intent.metadata?.credits ?? 0);
  const packageId = intent.metadata?.packageId ?? "unknown";
  if (!studentId || !credits) return;

  const grant = await applyCreditDelta({
    studentId,
    amount: credits,
    source: `stripe_topup:${intent.id}`,
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

  logger.info("stripe_credit_topup_pi_applied", {
    studentId,
    credits,
    packageId,
    paymentIntentId: intent.id,
    fxRate: intent.metadata?.fxRate || null,
  });
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
