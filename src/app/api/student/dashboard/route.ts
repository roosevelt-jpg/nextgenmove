import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  calculateProfileCompleteness,
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const [matchesSnapshot, contentSnapshot, purchasesSnapshot, stagesSnapshot] =
      await Promise.all([
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
      ]);

    const stageMap = new Map(
      stagesSnapshot.docs.map((doc) => [doc.id, doc.data().name ?? doc.id]),
    );

    const matches = matchesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        stageId: data.stageId ?? "",
        stageName: stageMap.get(data.stageId ?? "") ?? data.stageId ?? "",
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
          type: data.type ?? "download",
          purchased: purchasedIds.has(doc.id),
        };
      })
      .filter((item) => {
        if (!session.student.sector) {
          return true;
        }

        return item.category === session.student.sector;
      });

    return NextResponse.json({
      credits: session.student.credits,
      profileCompleteness: calculateProfileCompleteness(session.student),
      matches,
      recommendedContent,
    });
  } catch (error) {
    console.error("student_dashboard_failed", error);
    return NextResponse.json({
      credits: session.student.credits,
      profileCompleteness: calculateProfileCompleteness(session.student),
      matches: [],
      recommendedContent: [],
    });
  }
}
