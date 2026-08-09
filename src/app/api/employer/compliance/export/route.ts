import { NextResponse } from "next/server";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { buildEmployerComplianceExport } from "@/lib/compliance/export-employer";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/** Employer / company DSAR JSON export. */
export async function GET(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  return withRequestLog(
    request,
    {
      route: "/api/employer/compliance/export",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      try {
        const payload = await buildEmployerComplianceExport(session.companyId);
        return NextResponse.json(payload, {
          headers: {
            "Content-Disposition": `attachment; filename="nextgenmove-company-export-${session.companyId}.json"`,
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        await captureException(error, {
          route: "/api/employer/compliance/export",
          userId: session.user.uid,
        });
        logger.error("employer_compliance_export_failed", {
          userId: session.user.uid,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "export_failed" }, { status: 500 });
      }
    },
  );
}
