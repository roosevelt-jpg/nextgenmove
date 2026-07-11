import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { applyCreditDelta } from "@/lib/credits/ledger";
import { computeMatchScore } from "@/lib/matching/score";
import { upsertMatchAccess } from "@/lib/match-access";
import { stripUndefined } from "@/lib/stripUndefined";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "promote", "dismiss", "review"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type Source = "requests" | "job_applications" | "role_interest_submissions";

function isSource(value: string): value is Source {
  return (
    value === "requests" ||
    value === "job_applications" ||
    value === "role_interest_submissions"
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ source: string; id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { source, id } = await context.params;

  if (!isSource(source)) {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }

  try {
    const body = actionSchema.parse(await request.json());
    const ref = adminDb.collection(source).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data = snapshot.data()!;

    if (source === "requests") {
      const nextStatus =
        body.action === "approve"
          ? "actioned"
          : body.action === "reject"
            ? "dismissed"
            : "reviewed";

      await ref.update(
        stripUndefined({
          status: nextStatus,
          resolvedAt:
            body.action === "approve" || body.action === "reject"
              ? FieldValue.serverTimestamp()
              : undefined,
        }),
      );

      // Plan-change requests activate the company plan on approve (blueprint §5.3).
      if (
        body.action === "approve" &&
        data.type === "plan_request" &&
        data.companyId
      ) {
        const payload = (data.payload ?? {}) as Record<string, unknown>;
        const requestedPlan = payload.requestedPlan;
        if (requestedPlan === "track_a" || requestedPlan === "track_b") {
          await adminDb
            .collection("companies")
            .doc(String(data.companyId))
            .update(
              stripUndefined({
                plan: requestedPlan,
                subscriptionStatus: "active",
                updatedAt: FieldValue.serverTimestamp(),
              }),
            );
        }
      }

      // Credit top-up requests grant credits on approve (no Stripe in v1).
      if (
        body.action === "approve" &&
        data.type === "credit_topup" &&
        data.studentId
      ) {
        const payload = (data.payload ?? {}) as Record<string, unknown>;
        const credits = Number(payload.credits ?? 0);
        if (credits > 0) {
          await applyCreditDelta({
            studentId: String(data.studentId),
            amount: credits,
            source: `topup:${id}`,
            once: true,
          });
        }
      }
    }

    if (source === "job_applications") {
      const nextStatus =
        body.action === "approve"
          ? "reviewed"
          : body.action === "reject"
            ? "rejected"
            : "reviewed";

      await ref.update(stripUndefined({ status: nextStatus }));
    }

    if (source === "role_interest_submissions") {
      if (body.action === "promote") {
        const companyId = String(body.metadata?.companyId ?? "");
        const stageId = String(body.metadata?.stageId ?? "");

        if (!companyId || !stageId) {
          return NextResponse.json({ error: "missing_promote_fields" }, { status: 400 });
        }

        const studentSnapshot = await adminDb
          .collection("students")
          .where("email", "==", data.email)
          .limit(1)
          .get();

        const studentDoc = studentSnapshot.docs[0];
        const studentId = studentDoc?.id;

        if (!studentId || !studentDoc) {
          return NextResponse.json({ error: "student_not_found" }, { status: 400 });
        }

        const companySnap = await adminDb.collection("companies").doc(companyId).get();
        const companyData = companySnap.data() ?? {};
        const studentData = studentDoc.data();
        const matchScore = computeMatchScore({
          student: {
            fullName: studentData.fullName ?? "",
            sector: studentData.sector ?? "",
            seniority: studentData.seniority ?? "",
            currentCity: studentData.currentCity ?? "",
            targetCities: studentData.targetCities ?? [],
            bio: studentData.bio ?? "",
            skills: studentData.skills ?? [],
            availability: studentData.availability ?? "",
            cvUrl: studentData.cvUrl ?? null,
            linkedinUrl: studentData.linkedinUrl ?? null,
            portfolioUrl: studentData.portfolioUrl ?? null,
            photoUrl: studentData.photoUrl ?? null,
          },
          company: {
            industry: companyData.industry ?? "",
            preferredLocations: companyData.preferredLocations ?? [],
            requirementTags: companyData.requirementTags ?? [],
          },
        });

        const matchRef = adminDb.collection("matches").doc();

        await matchRef.set(
          stripUndefined({
            id: matchRef.id,
            companyId,
            studentId,
            stageId,
            shortlisted: false,
            matchScore,
            source: "admin_curated",
            notes: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }),
        );

        await upsertMatchAccess(companyId, studentId);

        await ref.update(stripUndefined({ status: "promoted", matchId: matchRef.id }));
      } else if (body.action === "reject" || body.action === "dismiss") {
        await ref.update(stripUndefined({ status: "dismissed" }));
      }
    }

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: `pending_request_${body.action}`,
      targetType: source,
      targetId: id,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("pending_request_action_failed", error);
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }
}
