import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { computeMatchScore } from "@/lib/matching/score";
import { upsertMatchAccess } from "@/lib/match-access";
import { stripUndefined } from "@/lib/stripUndefined";

function serializeDoc(id: string, data: FirebaseFirestore.DocumentData) {
  const output: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      output[key] = serializeTimestamp(value as FirebaseFirestore.Timestamp);
    } else {
      output[key] = value;
    }
  }

  return output;
}

const actionSchema = z.object({
  action: z.enum([
    "change_plan",
    "suspend",
    "activate",
    "add_note",
    "create_match",
  ]),
  plan: z.enum(["track_a", "track_b"]).nullable().optional(),
  note: z.string().optional(),
  companyId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  stageId: z.string().min(1).optional(),
});

type EntityType = "companies" | "students";

function isEntityType(value: string): value is EntityType {
  return value === "companies" || value === "students";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ type: string; id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { type, id } = await context.params;

  if (!isEntityType(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const snapshot = await adminDb.collection(type).doc(id).get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const activitySnapshot = await adminDb
    .collection("activity_log")
    .where("targetType", "==", type)
    .where("targetId", "==", id)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get()
    .catch(() => null);

  const activity =
    activitySnapshot?.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action ?? "",
        actorId: data.actorId ?? "",
        createdAt: serializeTimestamp(data.createdAt),
        metadata: data.metadata ?? {},
      };
    }) ?? [];

  return NextResponse.json({
    item: serializeDoc(snapshot.id, snapshot.data()!),
    activity,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string; id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { type, id } = await context.params;

  if (!isEntityType(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  try {
    const body = actionSchema.parse(await request.json());
    const ref = adminDb.collection(type).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (body.action === "change_plan" && type === "companies") {
      await ref.update(stripUndefined({ plan: body.plan ?? null }));
    }

    if (body.action === "suspend") {
      const data = snapshot.data()!;
      const userId = data.userId as string | undefined;

      if (userId) {
        await adminDb
          .collection("users")
          .doc(userId)
          .update(stripUndefined({ status: "suspended" }));
      }

      if (type === "students") {
        await ref.update(stripUndefined({ status: "inactive" }));
      }

      if (type === "companies") {
        await ref.update(stripUndefined({ subscriptionStatus: "inactive" }));
      }
    }

    if (body.action === "activate") {
      const data = snapshot.data()!;
      const userId = data.userId as string | undefined;

      if (userId) {
        await adminDb
          .collection("users")
          .doc(userId)
          .update(stripUndefined({ status: "active" }));
      }

      if (type === "students") {
        await ref.update(stripUndefined({ status: "active" }));
      }

      if (type === "companies") {
        await ref.update(stripUndefined({ subscriptionStatus: "active" }));
      }
    }

    if (body.action === "add_note" && body.note) {
      await ref.update(
        stripUndefined({
          notes: FieldValue.arrayUnion({
            authorId: session.uid,
            text: body.note,
            createdAt: new Date().toISOString(),
          }),
        }),
      );
    }

    if (body.action === "create_match") {
      const companyId =
        type === "companies" ? id : (body.companyId ?? "");
      const studentId =
        type === "students" ? id : (body.studentId ?? "");
      const stageId = body.stageId ?? "pipeline_new_match";

      if (!companyId || !studentId) {
        return NextResponse.json({ error: "missing_match_pair" }, { status: 400 });
      }

      const [companySnap, studentSnap, stageSnap, existingSnap] =
        await Promise.all([
          adminDb.collection("companies").doc(companyId).get(),
          adminDb.collection("students").doc(studentId).get(),
          adminDb.collection("pipeline_stages").doc(stageId).get(),
          adminDb
            .collection("matches")
            .where("companyId", "==", companyId)
            .where("studentId", "==", studentId)
            .limit(1)
            .get(),
        ]);

      if (!companySnap.exists || !studentSnap.exists) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      if (!stageSnap.exists) {
        return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
      }

      if (!existingSnap.empty) {
        return NextResponse.json({
          item: serializeDoc(existingSnap.docs[0]!.id, existingSnap.docs[0]!.data()),
          alreadyExists: true,
        });
      }

      const companyData = companySnap.data()!;
      const studentData = studentSnap.data()!;
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

      await logActivity({
        actorId: session.uid,
        actorRole: session.role,
        action: "crm_create_match",
        targetType: "matches",
        targetId: matchRef.id,
        metadata: stripUndefined({ companyId, studentId }),
      });

      const created = await matchRef.get();
      return NextResponse.json({
        item: serializeDoc(created.id, created.data()!),
      });
    }

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: `crm_${body.action}`,
      targetType: type,
      targetId: id,
      metadata: stripUndefined({ plan: body.plan, note: body.note }),
    });

    const updated = await ref.get();

    return NextResponse.json({ item: serializeDoc(updated.id, updated.data()!) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("crm_action_failed", error);
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }
}
