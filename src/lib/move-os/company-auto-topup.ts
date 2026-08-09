import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { getProgramLevers } from "@/lib/collections/pages";
import { resolveCompanyCreditPackages } from "@/lib/move-os/company-credits";
import { isStripeLive } from "@/lib/billing/stripe";
import { sendRawEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";

/**
 * After dual-commit debit: if company balance is under autoTopUpThreshold and
 * autoTopUpPackId is set, create a Stripe checkout (or manual request) and notify.
 */
export async function maybeCompanyAutoTopUp(input: {
  companyId: string;
  request?: Request;
}): Promise<{ triggered: boolean; reason?: string; url?: string }> {
  const companyRef = adminDb.collection("companies").doc(input.companyId);
  const snap = await companyRef.get();
  if (!snap.exists) return { triggered: false, reason: "company_not_found" };

  const data = snap.data() ?? {};
  const threshold = Number(data.autoTopUpThreshold ?? 0);
  const packId = String(data.autoTopUpPackId ?? "").trim();
  if (!Number.isFinite(threshold) || threshold <= 0 || !packId) {
    return { triggered: false, reason: "auto_topup_disabled" };
  }

  const credits = Number(data.credits ?? 0);
  if (credits >= threshold) {
    return { triggered: false, reason: "above_threshold" };
  }

  const levers = await getProgramLevers();
  const pack = resolveCompanyCreditPackages(levers).find((p) => p.id === packId);
  if (!pack) return { triggered: false, reason: "invalid_pack" };

  const contactEmail = String(data.contactEmail ?? "").trim();
  const companyName = String(data.name ?? "Company");

  if (await isStripeLive()) {
    if (!input.request) {
      return { triggered: false, reason: "request_required_for_checkout" };
    }
    const { createCompanyCreditTopUpCheckout } = await import(
      "@/lib/billing/checkout"
    );
    const checkout = await createCompanyCreditTopUpCheckout({
      companyId: input.companyId,
      companyEmail: contactEmail || undefined,
      companyName,
      packageId: pack.id,
      credits: pack.credits,
      priceEur: pack.priceEur,
      label: pack.label,
      request: input.request,
    });

    const body = `Company commit credits fell to ${credits} (threshold ${threshold}). Top up ${pack.credits} credits: ${checkout.url}`;
    void createNotification({
      userId: input.companyId,
      type: "activity",
      title: "Auto top-up ready",
      body,
      link: "/employer/bench",
    });
    if (contactEmail.includes("@")) {
      void sendRawEmail({
        to: contactEmail,
        subject: "Nextgenmove · Company credit auto top-up",
        html: `<p>${body}</p>`,
        text: body,
      });
    }
    return { triggered: true, url: checkout.url };
  }

  const requestRef = adminDb.collection("requests").doc();
  await requestRef.set(
    stripUndefined({
      id: requestRef.id,
      type: "company_credit_autotopup",
      companyId: input.companyId,
      studentId: null,
      payload: {
        packageId: pack.id,
        label: pack.label,
        credits: pack.credits,
        priceEur: pack.priceEur,
        balance: credits,
        threshold,
      },
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    }),
  );

  const body = `Company commit credits fell to ${credits}. Manual auto top-up requested for ${pack.label}.`;
  void createNotification({
    userId: input.companyId,
    type: "activity",
    title: "Auto top-up requested",
    body,
    link: "/employer/bench",
  });
  if (contactEmail.includes("@")) {
    void sendRawEmail({
      to: contactEmail,
      subject: "Nextgenmove · Company credit auto top-up",
      html: `<p>${body}</p>`,
      text: body,
    });
  }
  return { triggered: true, reason: "manual_request" };
}
