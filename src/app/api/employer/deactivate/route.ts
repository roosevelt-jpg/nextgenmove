import { NextResponse } from "next/server";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { anonymizeAndSuspendAccount } from "@/lib/security/anonymize-account";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  return withRequestLog(
    request,
    {
      route: "/api/employer/deactivate",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      try {
        await anonymizeAndSuspendAccount({
          uid: session.user.uid,
          role: "company",
          reason: "employer_self_deactivate",
        });

        return NextResponse.json({ ok: true });
      } catch (error) {
        await captureException(error, {
          route: "/api/employer/deactivate",
          userId: session.user.uid,
        });
        logger.error("employer_deactivate_failed", {
          userId: session.user.uid,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "deactivate_failed" }, { status: 500 });
      }
    },
  );
}
