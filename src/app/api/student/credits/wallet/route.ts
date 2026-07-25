import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getProgramLevers } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { isStripeLive } from "@/lib/billing/stripe";
import {
  creditSourceLabelKey,
  defaultCreditSourceLabel,
} from "@/lib/credits/source-labels";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";
import {
  currencySymbol,
  normalizeCurrencyCode,
} from "@/lib/public/currency";
import { convertAmount } from "@/lib/public/fx";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );

  try {
    const [levers, stripeEnabled, settings, txSnap] = await Promise.all([
      getProgramLevers(),
      isStripeLive(),
      getSiteSettings(),
      adminDb
        .collection("credit_transactions")
        .where("studentId", "==", session.studentId)
        .get(),
    ]);

    const currency = normalizeCurrencyCode(settings.defaultCurrency);
    const creditsPerEuro = Number(levers?.creditsPerEuro ?? 4) || 4;
    const packs = levers?.creditTopUpPackages ?? [];

    let fxRate: number | null = null;
    let packages = packs.map((pack) => ({
      ...pack,
      priceDisplay: pack.priceEur,
    }));

    if (currency !== "EUR") {
      try {
        const { quote } = await convertAmount(1, "EUR", currency);
        fxRate = quote.rate;
        packages = packs.map((pack) => ({
          ...pack,
          priceDisplay: Math.round(pack.priceEur * quote.rate * 100) / 100,
        }));
      } catch {
        // Keep EUR amounts when FX is down.
      }
    }

    const transactions = txSnap.docs
      .map((doc) => {
        const data = doc.data();
        const source = String(data.source ?? "");
        return {
          id: doc.id,
          direction: data.direction === "spend" ? "spend" : "earn",
          amount: Number(data.amount ?? 0),
          source,
          sourceKey: creditSourceLabelKey(source),
          sourceLabel: defaultCreditSourceLabel(source),
          relatedContentId: data.relatedContentId ?? null,
          createdAt: serializeTimestamp(
            data.createdAt as FirebaseFirestore.Timestamp | undefined,
          ),
        };
      })
      .sort((a, b) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bt - at;
      })
      .slice(0, limit);

    return NextResponse.json({
      credits: session.student.credits,
      packages,
      creditsPerEuro,
      currency,
      currencySymbol: currencySymbol(currency),
      fxRate,
      stripeEnabled,
      transactions,
    });
  } catch (error) {
    console.error(
      "student_wallet_failed",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
