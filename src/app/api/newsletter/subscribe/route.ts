import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { notifyAdminsOfPending } from "@/lib/email/notify-admins";
import { stripUndefined } from "@/lib/stripUndefined";

const subscribeSchema = z.object({
  email: z.string().email(),
  corridor: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = subscribeSchema.parse(await request.json());
    const normalizedEmail = parsed.email.trim().toLowerCase();
    const corridor = parsed.corridor?.trim() || undefined;

    const existing = await adminDb
      .collection("newsletter_subscribers")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }

    const subscriberRef = adminDb.collection("newsletter_subscribers").doc();

    await subscriberRef.set(
      stripUndefined({
        id: subscriberRef.id,
        email: normalizedEmail,
        corridor,
        subscribedAt: FieldValue.serverTimestamp(),
      }),
    );

    void notifyAdminsOfPending(
      `New journal newsletter subscriber: ${normalizedEmail}`,
      request,
    );

    return NextResponse.json({ id: subscriberRef.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("newsletter_subscribe_failed", error);
    return NextResponse.json({ error: "subscribe_failed" }, { status: 500 });
  }
}
