import { NextResponse } from "next/server";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { buildStudentComplianceExport } from "@/lib/compliance/export-student";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/** Student DSAR JSON export. */
export async function GET(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  return withRequestLog(
    request,
    {
      route: "/api/student/compliance/export",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      try {
        const payload = await buildStudentComplianceExport(session.studentId);
        return NextResponse.json(payload, {
          headers: {
            "Content-Disposition": `attachment; filename="nextgenmove-student-export-${session.studentId}.json"`,
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        await captureException(error, {
          route: "/api/student/compliance/export",
          userId: session.user.uid,
        });
        logger.error("student_compliance_export_failed", {
          userId: session.user.uid,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "export_failed" }, { status: 500 });
      }
    },
  );
}
