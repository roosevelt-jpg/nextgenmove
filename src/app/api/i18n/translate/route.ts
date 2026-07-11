import { NextResponse } from "next/server";
import { z } from "zod";
import { withRequestLog } from "@/lib/observability/api-handler";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { normalizeLocale } from "@/lib/i18n/locales";
import { translateBatch } from "@/lib/i18n/translate";

const bodySchema = z.object({
  target: z.string().min(2).max(16),
  texts: z.array(z.string().max(500)).max(80),
});

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/i18n/translate" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `i18n:translate:ip:${ip}`,
      limit: 40,
      windowSec: 60,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    try {
      const body = bodySchema.parse(await request.json());
      const target = normalizeLocale(body.target);
      const translated = await translateBatch(body.texts, target);
      return NextResponse.json({ target, translated });
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
  });
}
