import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  forbiddenResponse,
  getEmployerSession,
  unauthorizedResponse,
  verifyMatchOwnership,
} from "@/lib/employer/session";

const patchSchema = z.object({
  shortlisted: z.boolean().optional(),
  stageId: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const match = await verifyMatchOwnership(id, session.companyId);

    if (!match) {
      return forbiddenResponse();
    }

    if (body.stageId) {
      const stageSnapshot = await adminDb
        .collection("pipeline_stages")
        .doc(body.stageId)
        .get();

      if (!stageSnapshot.exists) {
        return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
      }
    }

    await adminDb
      .collection("matches")
      .doc(id)
      .update(
        stripUndefined({
          ...(body.shortlisted !== undefined ? { shortlisted: body.shortlisted } : {}),
          ...(body.stageId ? { stageId: body.stageId } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("match_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
