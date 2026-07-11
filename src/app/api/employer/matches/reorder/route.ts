import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

const reorderSchema = z.object({
  orderedMatchIds: z.array(z.string().min(1)).min(1),
});

export async function PATCH(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const { orderedMatchIds } = reorderSchema.parse(await request.json());
    const batch = adminDb.batch();

    for (let index = 0; index < orderedMatchIds.length; index += 1) {
      const matchId = orderedMatchIds[index]!;
      const ref = adminDb.collection("matches").doc(matchId);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.companyId !== session.companyId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (!snap.data()?.shortlisted) {
        return NextResponse.json({ error: "not_shortlisted" }, { status: 400 });
      }

      batch.update(
        ref,
        stripUndefined({
          shortlistRank: index + 1,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
    }

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("shortlist_reorder_failed", error);
    return NextResponse.json({ error: "reorder_failed" }, { status: 500 });
  }
}
