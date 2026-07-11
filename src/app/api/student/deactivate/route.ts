import { NextResponse } from "next/server";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { anonymizeAndSuspendAccount } from "@/lib/security/anonymize-account";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  return withRequestLog(
    request,
    {
      route: "/api/student/deactivate",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      try {
        await anonymizeAndSuspendAccount({
          uid: session.user.uid,
          role: "student",
          reason: "student_self_deactivate",
        });

        return NextResponse.json({ ok: true });
      } catch (error) {
        await captureException(error, {
          route: "/api/student/deactivate",
          userId: session.user.uid,
        });
        logger.error("deactivate_failed", {
          userId: session.user.uid,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "deactivate_failed" }, { status: 500 });
      }
    },
  );
}
