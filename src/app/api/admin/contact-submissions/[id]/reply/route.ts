import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { sendRawEmail } from "@/lib/email/send";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { stripUndefined } from "@/lib/stripUndefined";
import { serializeForClient } from "@/lib/firestore-utils";

const replySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const ip = clientIpFromRequest(request);
  const limited = await enforceRateLimit({
    key: `contact_reply:ip:${ip}`,
    limit: 30,
    windowSec: 60,
  });
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const { id } = await context.params;
  const ref = adminDb.collection("contact_submissions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const body = replySchema.parse(await request.json());
    const data = snap.data()!;
    const email = String(data.email ?? "").trim();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "missing_email" }, { status: 400 });
    }

    const sent = await sendRawEmail({
      to: email,
      subject: body.subject,
      html: `<p>${body.body.replace(/\n/g, "<br/>")}</p>`,
      text: body.body,
    });
    if (!sent.sent) {
      return NextResponse.json(
        { error: sent.reason ?? "email_failed" },
        { status: 502 },
      );
    }

    await ref.update(
      stripUndefined({
        status: "replied",
        lastReplyAt: FieldValue.serverTimestamp(),
        lastReplyPreview: body.body.slice(0, 200),
        lastReplySubject: body.subject,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "contact_submission_reply",
      targetType: "contact_submissions",
      targetId: id,
      metadata: stripUndefined({
        subject: body.subject,
        preview: body.body.slice(0, 120),
      }),
    });

    const next = await ref.get();
    return NextResponse.json({
      ok: true,
      item: serializeForClient({ id: next.id, ...next.data() }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "send_failed";
    console.error("contact_reply_failed", message);
    return NextResponse.json(
      { error: message.includes("not_configured") ? message : "send_failed" },
      { status: 503 },
    );
  }
}
