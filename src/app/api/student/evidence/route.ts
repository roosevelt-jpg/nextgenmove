import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  createEvidenceItem,
  listStudentEvidence,
  listSupersededByKind,
  recomputeAndPersistStudentReadiness,
} from "@/lib/move-os/evidence";
import { EVIDENCE_KINDS } from "@/types/move-os";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  label: z.string().trim().min(1).max(120),
  expiresAt: z.string().datetime().nullable().optional(),
  file: z.object({
    url: z.string().url(),
    path: z.string().min(1),
    filename: z.string().min(1),
    size: z.number().nullable(),
    mimeType: z.string(),
    uploadedAt: z.string().nullable(),
  }),
});

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/student/evidence" }, async () => {
    const session = await getStudentSession();
    if (!session) return unauthorizedResponse();
    const [items, readiness] = await Promise.all([
      listStudentEvidence(session.studentId),
      recomputeAndPersistStudentReadiness(session.studentId),
    ]);
    return NextResponse.json({
      items,
      readiness,
      supersededByKind: listSupersededByKind(items),
    });
  });
}

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/student/evidence" }, async () => {
    const session = await getStudentSession();
    if (!session) return unauthorizedResponse();
    const previewBlock = assertNotPreviewMode(session.mode);
    if (previewBlock) return previewBlock;

    try {
      const body = createSchema.parse(await request.json());
      const item = await createEvidenceItem({
        studentId: session.studentId,
        kind: body.kind,
        label: body.label,
        file: body.file,
        expiresAt: body.expiresAt ?? null,
      });
      const readiness = await recomputeAndPersistStudentReadiness(session.studentId);
      return NextResponse.json({ item, readiness });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      return NextResponse.json({ error: "evidence_create_failed" }, { status: 500 });
    }
  });
}
