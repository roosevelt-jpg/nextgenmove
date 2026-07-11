import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  calculateProfileCompleteness,
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

function weekStart(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const [
      matchesSnapshot,
      contentSnapshot,
      purchasesSnapshot,
      stagesSnapshot,
      txSnapshot,
    ] = await Promise.all([
      adminDb
        .collection("matches")
        .where("studentId", "==", session.studentId)
        .get(),
      adminDb.collection("content_items").where("status", "==", "live").get(),
      adminDb
        .collection("content_purchases")
        .where("studentId", "==", session.studentId)
        .get(),
      adminDb.collection("pipeline_stages").get(),
      adminDb
        .collection("credit_transactions")
        .where("studentId", "==", session.studentId)
        .get(),
    ]);

    const stageMap = new Map(
      stagesSnapshot.docs.map((doc) => [
        doc.id,
        {
          name: String(doc.data().name ?? doc.id),
          order: Number(doc.data().order ?? 0),
        },
      ]),
    );

    const matches = matchesSnapshot.docs.map((doc) => {
      const data = doc.data();
      const stage = stageMap.get(data.stageId ?? "");
      return {
        id: doc.id,
        stageId: data.stageId ?? "",
        stageName: stage?.name ?? data.stageId ?? "",
        order: stage?.order ?? 0,
        shortlisted: Boolean(data.shortlisted),
        companyId: data.companyId ?? "",
      };
    });

    const purchasedIds = new Set(
      purchasesSnapshot.docs.map((doc) => doc.data().contentItemId as string),
    );

    const recommendedContent = contentSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title ?? "",
          category: data.category ?? "",
          costCredits: data.costCredits ?? 0,
          priceEur:
            data.priceEur == null ? undefined : Number(data.priceEur),
          type: data.type ?? "download",
          purchased: purchasedIds.has(doc.id),
        };
      })
      .sort((a, b) => Number(a.purchased) - Number(b.purchased));

    const now = new Date();
    const weeks: { start: Date; label: string; earned: number; spent: number }[] =
      [];
    for (let i = 7; i >= 0; i--) {
      const start = weekStart(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i * 7)),
      );
      weeks.push({
        start,
        label: start.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        earned: 0,
        spent: 0,
      });
    }

    for (const doc of txSnapshot.docs) {
      const data = doc.data();
      const created =
        data.createdAt?.toDate?.() ??
        (data.createdAt ? new Date(data.createdAt) : null);
      if (!created || Number.isNaN(created.getTime())) continue;
      const amount = Math.abs(Number(data.amount ?? data.delta ?? 0));
      const direction = String(data.direction ?? "").toLowerCase();
      const idx = weeks.findIndex((w, i) => {
        const next = weeks[i + 1]?.start;
        return created >= w.start && (!next || created < next);
      });
      if (idx < 0 || !amount) continue;
      if (direction === "spend" || Number(data.amount ?? data.delta ?? 0) < 0) {
        weeks[idx]!.spent += amount;
      } else {
        weeks[idx]!.earned += amount;
      }
    }

    const thisMonth = weeks.slice(-4);
    const earned = thisMonth.reduce((s, w) => s + w.earned, 0);
    const spent = thisMonth.reduce((s, w) => s + w.spent, 0);
    const earnSpendDeltaPct =
      spent === 0
        ? earned > 0
          ? 100
          : 0
        : Math.round(((earned - spent) / spent) * 100);

    return NextResponse.json({
      credits: session.student.credits,
      profileCompleteness: calculateProfileCompleteness(session.student),
      matches,
      recommendedContent,
      creditActivity: weeks.map(({ label, earned, spent }) => ({
        label,
        earned,
        spent,
      })),
      earnSpendDeltaPct,
    });
  } catch (error) {
    console.error("student_dashboard_failed", error);
    return NextResponse.json({
      credits: session.student.credits,
      profileCompleteness: calculateProfileCompleteness(session.student),
      matches: [],
      recommendedContent: [],
      creditActivity: Array.from({ length: 8 }, (_, i) => ({
        label: `W${i + 1}`,
        earned: 0,
        spent: 0,
      })),
      earnSpendDeltaPct: 0,
    });
  }
}
