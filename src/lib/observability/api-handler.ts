import {
  captureException,
  createRequestId,
  logger,
} from "@/lib/observability/logger";

export interface RequestLogContext {
  route: string;
  userId?: string | null;
  role?: string | null;
}

/**
 * Wraps an API handler with structured JSON request logging (request ID, latency, status).
 */
export async function withRequestLog(
  request: Request,
  context: RequestLogContext,
  handler: (ctx: { requestId: string }) => Promise<Response>,
): Promise<Response> {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const started = Date.now();
  const method = request.method;

  try {
    const response = await handler({ requestId });
    const latencyMs = Date.now() - started;

    logger.info("api_request", {
      requestId,
      route: context.route,
      method,
      userId: context.userId ?? null,
      role: context.role ?? null,
      status: response.status,
      latencyMs,
    });

    const headers = new Headers(response.headers);
    headers.set("x-request-id", requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const latencyMs = Date.now() - started;

    await captureException(error, {
      requestId,
      route: context.route,
      method,
      userId: context.userId ?? null,
      role: context.role ?? null,
      latencyMs,
    });

    logger.error("api_request_unhandled", {
      requestId,
      route: context.route,
      method,
      userId: context.userId ?? null,
      role: context.role ?? null,
      status: 500,
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { error: "internal_error", requestId },
      {
        status: 500,
        headers: { "x-request-id": requestId },
      },
    );
  }
}
