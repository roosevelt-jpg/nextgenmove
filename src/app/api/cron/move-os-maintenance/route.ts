import { NextResponse } from "next/server";
import { expireStaleBenchHolds } from "@/lib/move-os/bench";
import { enforceArrivalSlas } from "@/lib/move-os/arrival";
import { flushSponsorWhatsAppDigests } from "@/lib/move-os/sponsor";
import { withRequestLog } from "@/lib/observability/api-handler";

/**
 * Expire Visa-Cleared Bench holds, auto-flag Arrival SLA misses,
 * and best-effort flush Family Trust Pack WhatsApp digests.
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/cron/move-os-maintenance" }, async () => {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = request.headers.get("authorization") ?? "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const [expiredHolds, slaFlagged, sponsorDigests] = await Promise.all([
      expireStaleBenchHolds(100),
      enforceArrivalSlas(50),
      flushSponsorWhatsAppDigests(40),
    ]);

    return NextResponse.json({
      ok: true,
      expiredHolds,
      slaFlagged,
      sponsorDigests,
    });
  });
}
