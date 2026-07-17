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

const LEAD_COLLECTIONS = [
  "job_applications",
  "requests",
  "role_interest_submissions",
  "newsletter_subscribers",
] as const;

type LeadCollection = (typeof LEAD_COLLECTIONS)[number];

const messageSchema = z.object({
  sourceCollection: z.enum(LEAD_COLLECTIONS),
  sourceId: z.string().min(1),
  channel: z.enum(["email", "sms", "whatsapp"]),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(4000),
});

function isLeadCollection(value: string): value is LeadCollection {
  return (LEAD_COLLECTIONS as readonly string[]).includes(value);
}

function resolveLeadContact(collection: LeadCollection, data: FirebaseFirestore.DocumentData) {
  if (collection === "job_applications" || collection === "role_interest_submissions") {
    return {
      email: String(data.email ?? "").trim(),
      phone: String(data.phone ?? "").trim(),
      name: String(data.fullName ?? data.email ?? ""),
    };
  }

  if (collection === "newsletter_subscribers") {
    return {
      email: String(data.email ?? "").trim(),
      phone: "",
      name: String(data.email ?? ""),
    };
  }

  const payload = (data.payload ?? {}) as Record<string, unknown>;
  return {
    email: String(
      payload.workEmail ?? payload.email ?? payload.contactEmail ?? "",
    ).trim(),
    phone: String(payload.phone ?? "").trim(),
    name: String(payload.contactName ?? payload.companyName ?? data.type ?? ""),
  };
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const ip = clientIpFromRequest(request);
  const limited = await enforceRateLimit({
    key: `crm:lead-message:ip:${ip}`,
    limit: 30,
    windowSec: 60,
  });
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  try {
    const body = messageSchema.parse(await request.json());
    if (!isLeadCollection(body.sourceCollection)) {
      return NextResponse.json({ error: "invalid_collection" }, { status: 400 });
    }

    const snap = await adminDb
      .collection(body.sourceCollection)
      .doc(body.sourceId)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const contact = resolveLeadContact(body.sourceCollection, snap.data()!);
    let providerId = "";

    if (body.channel === "email") {
      if (!contact.email.includes("@")) {
        return NextResponse.json({ error: "missing_email" }, { status: 400 });
      }
      const sent = await sendRawEmail({
        to: contact.email,
        subject: body.subject?.trim() || "Message from Nextgenmove",
        html: `<p>${body.body.replace(/\n/g, "<br/>")}</p>`,
        text: body.body,
      });
      if (!sent.sent) {
        return NextResponse.json(
          { error: sent.reason ?? "email_failed" },
          { status: 502 },
        );
      }
      providerId = contact.email;
    } else if (body.channel === "sms") {
      if (!contact.phone) {
        return NextResponse.json({ error: "missing_phone" }, { status: 400 });
      }
      const result = await sendSms({ to: contact.phone, body: body.body });
      providerId = result.sid;
    } else {
      if (!contact.phone) {
        return NextResponse.json({ error: "missing_phone" }, { status: 400 });
      }
      const result = await sendWhatsApp({ to: contact.phone, body: body.body });
      providerId = result.sid;
    }

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: `crm_lead_message_${body.channel}`,
      targetType: body.sourceCollection,
      targetId: body.sourceId,
      metadata: stripUndefined({
        channel: body.channel,
        subject: body.subject ?? null,
        preview: body.body.slice(0, 120),
        providerId,
        toName: contact.name || null,
      }),
    });

    await adminDb
      .collection(body.sourceCollection)
      .doc(body.sourceId)
      .set(
        stripUndefined({
          lastCrmMessageAt: FieldValue.serverTimestamp(),
          lastCrmMessageChannel: body.channel,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );

    return NextResponse.json({ ok: true, providerId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "send_failed";
    console.error("crm_lead_message_failed", message);
    return NextResponse.json(
      { error: message.includes("not_configured") ? message : "send_failed" },
      { status: 503 },
    );
  }
}
