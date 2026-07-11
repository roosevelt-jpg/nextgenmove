import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const [contentSnapshot, purchasesSnapshot] = await Promise.all([
      adminDb.collection("content_items").where("status", "==", "live").get(),
      adminDb
        .collection("content_purchases")
        .where("studentId", "==", session.studentId)
        .get(),
    ]);

    const purchasedMap = new Map(
      purchasesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return [data.contentItemId as string, doc.id];
      }),
    );

    const items = contentSnapshot.docs.map((doc) => {
      const data = doc.data();
      const purchased = purchasedMap.has(doc.id);

      return {
        id: doc.id,
        title: data.title ?? "",
        description: data.description ?? "",
        type: data.type ?? "download",
        thumbnailUrl: data.thumbnailUrl ?? "",
        downloadHref: purchased ? `/api/student/store/download/${doc.id}` : null,
        costCredits: data.costCredits ?? 0,
        priceEur: typeof data.priceEur === "number" ? data.priceEur : null,
        emojiIcon: data.emojiIcon ?? "",
        linkUrl: data.linkUrl ?? null,
        category: data.category ?? "",
        purchased,
        purchaseId: purchasedMap.get(doc.id) ?? null,
      };
    });

    return NextResponse.json({ items, credits: session.student.credits });
  } catch (error) {
    console.error("student_store_failed", error);
    return NextResponse.json({ items: [], credits: session.student.credits });
  }
}
