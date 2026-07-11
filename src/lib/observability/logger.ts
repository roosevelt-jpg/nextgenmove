import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  requestId?: string;
  userId?: string | null;
  role?: string | null;
  route?: string;
  method?: string;
  status?: number;
  latencyMs?: number;
  error?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    service: "nextgenmove",
    ...fields,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};

export function createRequestId(existing?: string | null): string {
  if (existing && existing.length >= 8 && existing.length <= 64) {
    return existing;
  }
  return randomUUID();
}

/** Best-effort error reporting. No-ops without SENTRY_DSN. */
export async function captureException(
  error: unknown,
  context: LogFields = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error("uncaught_exception", {
    ...context,
    error: message,
    stack,
  });

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Optional peer: `npm i @sentry/nextjs` when enabling production error tracking.
    // @ts-expect-error -- package may be absent until Sentry is enabled
    const sentry = await import("@sentry/nextjs").catch(() => null);
    if (sentry?.captureException) {
      sentry.captureException(error, { extra: context });
    }
  } catch {
    // Never block the request path on telemetry failure
  }
}
