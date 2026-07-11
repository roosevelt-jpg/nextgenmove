import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getProgramLevers } from "@/lib/collections/pages";
import { isStripeLive } from "@/lib/billing/stripe";
import {
  creditSourceLabelKey,
  defaultCreditSourceLabel,
} from "@/lib/credits/source-labels";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

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
    const [levers, stripeEnabled, txSnap] = await Promise.all([
      getProgramLevers(),
      isStripeLive(),
      adminDb
        .collection("credit_transactions")
        .where("studentId", "==", session.studentId)
        .get(),
    ]);

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
      packages: levers?.creditTopUpPackages ?? [],
      creditsPerEuro: levers?.creditsPerEuro ?? 4,
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
