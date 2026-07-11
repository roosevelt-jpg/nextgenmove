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
import { sendSms, sendWhatsApp } from "@/lib/sms/twilio";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { stripUndefined } from "@/lib/stripUndefined";

const messageSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(4000),
});

type EntityType = "companies" | "students";

function isEntityType(value: string): value is EntityType {
  return value === "companies" || value === "students";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string; id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const ip = clientIpFromRequest(request);
  const limited = await enforceRateLimit({
    key: `crm:message:ip:${ip}`,
    limit: 30,
    windowSec: 60,
  });
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const { type, id } = await context.params;
  if (!isEntityType(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  try {
    const body = messageSchema.parse(await request.json());
    const snap = await adminDb.collection(type).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data = snap.data()!;
    const userId = String(data.userId ?? id);
    const userSnap = await adminDb.collection("users").doc(userId).get();
    const userPhone = String(userSnap.data()?.phone ?? "").trim();

    const email =
      type === "companies"
        ? String(data.contactEmail ?? "")
        : String(data.email ?? "");
    const phone =
      type === "companies"
        ? String(data.contactPhone ?? userPhone ?? "")
        : String(data.phone ?? userPhone ?? "");

    let providerId = "";

    if (body.channel === "email") {
      if (!email.includes("@")) {
        return NextResponse.json({ error: "missing_email" }, { status: 400 });
      }
      const sent = await sendRawEmail({
        to: email,
        subject: body.subject?.trim() || "Message from Venturo",
        html: `<p>${body.body.replace(/\n/g, "<br/>")}</p>`,
        text: body.body,
      });
      if (!sent.sent) {
        return NextResponse.json(
          { error: sent.reason ?? "email_failed" },
          { status: 502 },
        );
      }
      providerId = email;
    } else if (body.channel === "sms") {
      if (!phone) {
        return NextResponse.json({ error: "missing_phone" }, { status: 400 });
      }
      const result = await sendSms({ to: phone, body: body.body });
      providerId = result.sid;
    } else {
      if (!phone) {
        return NextResponse.json({ error: "missing_phone" }, { status: 400 });
      }
      const result = await sendWhatsApp({ to: phone, body: body.body });
      providerId = result.sid;
    }

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: `crm_message_${body.channel}`,
      targetType: type,
      targetId: id,
      metadata: stripUndefined({
        channel: body.channel,
        subject: body.subject ?? null,
        preview: body.body.slice(0, 120),
        providerId,
      }),
    });

    await adminDb.collection(type).doc(id).update(
      stripUndefined({
        lastCrmMessageAt: FieldValue.serverTimestamp(),
        lastCrmMessageChannel: body.channel,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    return NextResponse.json({ ok: true, providerId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "send_failed";
    console.error("crm_message_failed", message);
    return NextResponse.json(
      { error: message.includes("not_configured") ? message : "send_failed" },
      { status: 503 },
    );
  }
}
