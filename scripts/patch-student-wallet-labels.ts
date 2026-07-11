/**
 * Patch student wallet / credits CMS labels.
 * Run: npx tsx scripts/patch-student-wallet-labels.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID!,
        clientEmail:
          process.env.FIREBASE_ADMIN_CLIENT_EMAIL ??
          process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (
          process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
        )!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const existing = snap.data() ?? {};

  const studentNavLabels = {
    ...((existing.studentNavLabels as Record<string, string>) || {}),
    dashboard: "Dashboard",
    wallet: "Wallet",
    store: "Store",
    profile: "Profile",
    settings: "Settings",
  };

  const studentPageLabels = {
    ...((existing.studentPageLabels as Record<string, unknown>) || {}),
  };

  studentPageLabels.dashboard = {
    ...((studentPageLabels.dashboard as Record<string, string>) || {}),
    walletEyebrow: "Wallet",
    walletTitle: "Your credits",
    walletSubtitle: "Balance, top-ups, and every credit movement in one place.",
    topUpButton: "Top up",
    topUpTitle: "Buy credits",
    topUpIntro:
      "Buy a credit pack. When Stripe is connected you pay by card; otherwise we confirm payment manually.",
    topUpAction: "Buy",
    topUpBuying: "Starting…",
    topUpRequested: "Request sent — pending admin approval.",
    topUpFailed: "Could not start top-up. Try again.",
    topUpSuccess: "Top-up successful. Balance updated.",
    topUpCancelled: "Top-up cancelled.",
    topUpNoPackages: "No packages available",
    transactionHistoryTitle: "Transaction history",
    transactionsEmpty: "No transactions yet",
    viewAllTransactions: "View all",
    walletStripeHint: "Card checkout available for top-ups.",
    walletManualHint:
      "Top-ups are requested for admin approval until Stripe is connected.",
    tx_stripe_topup: "Card top-up",
    tx_manual_topup: "Top-up (approved)",
    tx_redeem: "Content unlock",
    tx_referral: "Referral bonus",
    tx_welcome: "Welcome credits",
    tx_profile_complete: "Profile complete bonus",
    tx_other: "Adjustment",
    close: "Close",
    loading: "Loading…",
  };

  studentPageLabels.wallet = {
    ...((studentPageLabels.wallet as Record<string, string>) || {}),
    walletEyebrow: "Wallet",
    walletPageTitle: "Credits & history",
    walletPageSubtitle:
      "Your full ledger — top up anytime and track every earn and spend.",
    walletTitle: "Your credits",
    topUpButton: "Top up",
    transactionHistoryTitle: "All transactions",
  };

  await ref.set(
    stripUndefined({
      studentNavLabels,
      studentPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched student wallet labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
