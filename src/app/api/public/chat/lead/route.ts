import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { notifyAdminsOfPending } from "@/lib/email/notify-admins";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { withRequestLog } from "@/lib/observability/api-handler";
import { logger } from "@/lib/observability/logger";

const leadSchema = z.object({
  leadOffer: z.enum(["hiring", "talent"]),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  threadId: z.string().trim().min(1).optional(),
  transcriptSnippet: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/public/chat/lead" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `public_chat_lead:ip:${ip}`,
      limit: 8,
      windowSec: 3600,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    try {
      const body = leadSchema.parse(await request.json());
      const email = body.email.toLowerCase();
      const type =
        body.leadOffer === "hiring" ? "assistant_hiring" : "assistant_talent";

      if (body.threadId) {
        const threadRef = adminDb.collection("chat_threads").doc(body.threadId);
        const threadSnap = await threadRef.get();
        if (
          threadSnap.exists &&
          threadSnap.data()?.source === "public_widget" &&
          threadSnap.data()?.leadConverted
        ) {
          return NextResponse.json({
            ok: true,
            id: threadSnap.data()?.leadRequestId ?? null,
            alreadyConverted: true,
          });
        }
      }

      const requestRef = adminDb.collection("requests").doc();
      await requestRef.set(
        stripUndefined({
          id: requestRef.id,
          type,
          companyId: null,
          payload: {
            contactName: body.name,
            workEmail: email,
            email,
            name: body.name,
            source: "assistant",
            threadId: body.threadId ?? null,
            transcriptSnippet: body.transcriptSnippet ?? null,
            note: `source=assistant; intent=${body.leadOffer}`,
            // Hiring shape mirrors sourcing_request contact fields for CRM triage.
            ...(body.leadOffer === "hiring"
              ? {
                  companyName: body.name,
                  roleTitleNeeded: "Assistant hiring inquiry",
                  sector: "unspecified",
                  location: "unspecified",
                  numberOfHires: 1,
                  preferredTrack: "unspecified",
                  timeline: "assistant",
                  additionalRequirements: body.transcriptSnippet ?? null,
                }
              : {}),
          },
          status: "pending",
          createdAt: FieldValue.serverTimestamp(),
        }),
      );

      if (body.threadId) {
        await adminDb
          .collection("chat_threads")
          .doc(body.threadId)
          .set(
            stripUndefined({
              visitorName: body.name,
              visitorEmail: email,
              leadConverted: true,
              leadOffer: body.leadOffer,
              leadRequestId: requestRef.id,
              updatedAt: FieldValue.serverTimestamp(),
            }),
            { merge: true },
          );
      }

      void notifyAdminsOfPending(
        `Assistant ${body.leadOffer} lead: ${body.name} (${email})`,
        request,
        {
          link: "/admin/crm",
          title: `Assistant ${body.leadOffer} lead`,
        },
      );

      return NextResponse.json({ ok: true, id: requestRef.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      logger.error("public_chat_lead_failed", {
        error: error instanceof Error ? error.message : String(error),
        route: "/api/public/chat/lead",
      });
      return NextResponse.json({ error: "submit_failed" }, { status: 500 });
    }
  });
}
