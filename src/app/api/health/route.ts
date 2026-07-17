import { NextResponse } from "next/server";
import { createRequestId, logger } from "@/lib/observability/logger";

/**
 * Synthetic uptime probe. Does not touch Firestore so it stays cheap and safe.
 * External monitors should alert if this returns non-200.
 */
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const body = {
    ok: true,
    service: "Nextgenmove",
    ts: new Date().toISOString(),
    requestId,
  };

  logger.info("health_check", { requestId, route: "/api/health", status: 200 });

  return NextResponse.json(body, {
    headers: { "x-request-id": requestId },
  });
}
