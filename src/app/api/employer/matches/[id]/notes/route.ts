import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  forbiddenResponse,
  getEmployerSession,
  unauthorizedResponse,
  verifyMatchOwnership,
} from "@/lib/employer/session";
import { stripUndefined } from "@/lib/stripUndefined";

const noteSchema = z.object({
  text: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  const { id } = await params;

  try {
    const { text } = noteSchema.parse(await request.json());
    const match = await verifyMatchOwnership(id, session.companyId);

    if (!match) {
      return forbiddenResponse();
    }

    const note = {
      authorId: session.user.uid,
      text,
      createdAt: new Date().toISOString(),
    };

    await adminDb
      .collection("matches")
      .doc(id)
      .update(
        stripUndefined({
          notes: FieldValue.arrayUnion(note),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("match_note_failed", error);
    return NextResponse.json({ error: "note_failed" }, { status: 500 });
  }
}
