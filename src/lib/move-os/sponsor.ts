import { createHash, randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { sendRawEmail } from "@/lib/email/send";
import type { SponsorLink } from "@/types/move-os";
import { listStudentEvidence } from "./evidence";
import { listMovesForStudent } from "./itinerary";
import { getMoveOsLevers } from "./config";
import { notifyMoveOsParty } from "./notify";
import {
  buildSponsorWhatsAppDigestBody,
} from "./sponsor-report";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/[\s()-]/g, "");
  if (!trimmed) return null;
  if (!/^\+?[0-9]{8,16}$/.test(trimmed)) return null;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

export async function createSponsorLink(input: {
  studentId: string;
  sponsorName: string;
  sponsorEmail: string;
  phone?: string | null;
  whatsappOptIn?: boolean;
  /** Full trust portal URL, or omit and pass `publicBaseUrl` to build from token. */
  sponsorUrl?: string;
  publicBaseUrl?: string;
}): Promise<{ link: SponsorLink; token: string }> {
  const levers = await getMoveOsLevers();
  if (!levers.sponsorEnabled) throw new Error("sponsor_disabled");

  const token = randomBytes(24).toString("hex");
  const ref = adminDb.collection("sponsor_links").doc();
  const sponsorEmail = input.sponsorEmail.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  const whatsappOptIn = Boolean(input.whatsappOptIn) && Boolean(phone);
  const link = stripUndefined({
    id: ref.id,
    studentId: input.studentId,
    token: hashToken(token),
    sponsorName: input.sponsorName.trim(),
    sponsorEmail,
    phone,
    whatsappOptIn,
    lastWhatsAppDigestAt: null,
    status: "active" as const,
    createdAt: new Date().toISOString(),
    lastAccessAt: null,
  });
  await ref.set({
    ...link,
    createdAt: FieldValue.serverTimestamp(),
  });

  const sponsorUrl =
    input.sponsorUrl ??
    (input.publicBaseUrl
      ? `${input.publicBaseUrl.replace(/\/$/, "")}/sponsor/${token}`
      : null);

  if (sponsorUrl) {
    const body = `${input.sponsorName.trim()}, you have a read-only Nextgenmove trust link for this move: ${sponsorUrl}`;
    void sendRawEmail({
      to: sponsorEmail,
      subject: "Nextgenmove · Sponsor trust link",
      html: `<p>${body}</p><p><a href="${sponsorUrl}">Open trust portal</a></p>`,
      text: body,
    });
    void notifyMoveOsParty({
      userId: input.studentId,
      kind: "sponsor_link_created",
      body: `Sponsor trust link sent to ${sponsorEmail}.`,
      link: "/student/move",
    });
  }

  return { link: link as SponsorLink, token };
}

export async function resolveSponsorToken(token: string): Promise<SponsorLink | null> {
  const hashed = hashToken(token);
  const snap = await adminDb
    .collection("sponsor_links")
    .where("token", "==", hashed)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  await doc.ref.set(
    { lastAccessAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return { id: doc.id, ...(doc.data() as Omit<SponsorLink, "id">) };
}

/** Redacted sponsor dashboard payload — no employer confidential terms. */
export async function buildSponsorDashboard(studentId: string) {
  const [studentSnap, evidence, moves] = await Promise.all([
    adminDb.collection("students").doc(studentId).get(),
    listStudentEvidence(studentId),
    listMovesForStudent(studentId),
  ]);
  const student = studentSnap.data() ?? {};
  const activeMove = moves.find((m) => m.status === "active") ?? moves[0] ?? null;

  return {
    student: {
      displayName: String(student.fullName ?? student.displayName ?? "Talent"),
      dubaiReadyScore: Number(student.dubaiReadyScore ?? 0),
      benchStatus: String(student.benchStatus ?? "not_ready"),
    },
    evidence: evidence.map((item) => ({
      kind: item.kind,
      label: item.label,
      status: item.status,
      verifiedAt: item.verifiedAt ?? null,
    })),
    move: activeMove
      ? {
          id: activeMove.id,
          status: activeMove.status,
          startDate: activeMove.startDate ?? null,
          milestones: (activeMove.milestones ?? [])
            .filter((m) => m.visibleToSponsor !== false)
            .map((m) => ({
              key: m.key,
              label: m.label,
              status: m.status,
              dueAt: m.dueAt ?? null,
              blocker: m.blocker ?? null,
              completedAt: m.completedAt ?? null,
            })),
        }
      : null,
  };
}

/** Best-effort WhatsApp digest for one sponsor link. Never throws to callers. */
export async function sendSponsorWhatsAppDigest(input: {
  link: SponsorLink;
  eventNote?: string | null;
}): Promise<boolean> {
  try {
    if (!input.link.whatsappOptIn || !input.link.phone) return false;
    const { isTwilioLive, sendWhatsApp } = await import("@/lib/sms/twilio");
    if (!(await isTwilioLive())) return false;

    const dashboard = await buildSponsorDashboard(input.link.studentId);
    const body = buildSponsorWhatsAppDigestBody({
      sponsorName: input.link.sponsorName,
      dashboard,
      eventNote: input.eventNote,
    });
    await sendWhatsApp({ to: input.link.phone, body });
    await adminDb
      .collection("sponsor_links")
      .doc(input.link.id)
      .set(
        stripUndefined({
          lastWhatsAppDigestAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    return true;
  } catch (error) {
    console.error("sponsor_whatsapp_digest_failed", error);
    return false;
  }
}

/** Notify opt-in sponsors for a student after an arrival event (best-effort). */
export async function notifySponsorsOnArrival(input: {
  studentId: string;
  eventKind: string;
}): Promise<number> {
  const snap = await adminDb
    .collection("sponsor_links")
    .where("studentId", "==", input.studentId)
    .where("status", "==", "active")
    .get();
  let sent = 0;
  for (const doc of snap.docs) {
    const link = { id: doc.id, ...(doc.data() as Omit<SponsorLink, "id">) };
    if (!link.whatsappOptIn || !link.phone) continue;
    const ok = await sendSponsorWhatsAppDigest({
      link,
      eventNote: `Arrival update (${input.eventKind})`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

/**
 * Cron helper: send digests for opt-in sponsors that have not been messaged
 * in the last 24h (best-effort, Twilio must be configured).
 */
export async function flushSponsorWhatsAppDigests(limit = 40): Promise<number> {
  const snap = await adminDb
    .collection("sponsor_links")
    .where("status", "==", "active")
    .where("whatsappOptIn", "==", true)
    .limit(limit)
    .get();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let sent = 0;
  for (const doc of snap.docs) {
    const link = { id: doc.id, ...(doc.data() as Omit<SponsorLink, "id">) };
    if (!link.phone) continue;
    const rawLast = link.lastWhatsAppDigestAt as unknown;
    let lastMs = 0;
    if (typeof rawLast === "string") {
      lastMs = Date.parse(rawLast);
    } else if (
      rawLast &&
      typeof rawLast === "object" &&
      typeof (rawLast as { toDate?: () => Date }).toDate === "function"
    ) {
      lastMs = (rawLast as { toDate: () => Date }).toDate().getTime();
    }
    if (Number.isFinite(lastMs) && lastMs > cutoff) continue;
    const ok = await sendSponsorWhatsAppDigest({ link });
    if (ok) sent += 1;
  }
  return sent;
}
