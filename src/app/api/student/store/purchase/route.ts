import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";

const purchaseSchema = z.object({
  contentItemId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { contentItemId } = purchaseSchema.parse(await request.json());

    const result = await adminDb.runTransaction(async (transaction) => {
      const studentRef = adminDb.collection("students").doc(session.studentId);
      const contentRef = adminDb.collection("content_items").doc(contentItemId);
      const purchaseQuery = adminDb
        .collection("content_purchases")
        .where("studentId", "==", session.studentId)
        .where("contentItemId", "==", contentItemId)
        .limit(1);

      const studentDoc = await transaction.get(studentRef);
      const contentDoc = await transaction.get(contentRef);
      const existingPurchase = await transaction.get(purchaseQuery);

      if (!studentDoc.exists || !contentDoc.exists) {
        throw new Error("not_found");
      }

      const studentData = studentDoc.data()!;
      const contentData = contentDoc.data()!;

      if (contentData.status !== "live") {
        throw new Error("not_available");
      }

      if (!existingPurchase.empty) {
        return {
          alreadyPurchased: true,
          downloadHref: `/api/student/store/download/${contentItemId}`,
          credits: studentData.credits ?? 0,
        };
      }

      const cost = contentData.costCredits ?? 0;
      const currentCredits = studentData.credits ?? 0;

      if (currentCredits < cost) {
        throw new Error("insufficient_credits");
      }

      const purchaseRef = adminDb.collection("content_purchases").doc();
      const creditTxRef = adminDb.collection("credit_transactions").doc();

      transaction.set(
        purchaseRef,
        stripUndefined({
          id: purchaseRef.id,
          studentId: session.studentId,
          contentItemId,
          creditsCost: cost,
          purchasedAt: FieldValue.serverTimestamp(),
        }),
      );

      transaction.update(
        studentRef,
        stripUndefined({
          credits: currentCredits - cost,
        }),
      );

      if (cost > 0) {
        transaction.set(
          creditTxRef,
          stripUndefined({
            id: creditTxRef.id,
            studentId: session.studentId,
            direction: "spend",
            source: `redeem:${contentItemId}`,
            amount: cost,
            relatedContentId: contentItemId,
            createdAt: FieldValue.serverTimestamp(),
          }),
        );
      }

      return {
        alreadyPurchased: false,
        purchaseId: purchaseRef.id,
        downloadHref: `/api/student/store/download/${contentItemId}`,
        credits: currentCredits - cost,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "purchase_failed";

    if (message === "insufficient_credits") {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }

    if (message === "not_found" || message === "not_available") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("student_purchase_failed", error);
    return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
  }
}
