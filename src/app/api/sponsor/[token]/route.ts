import { NextResponse } from "next/server";
import {
  buildSponsorDashboard,
  resolveSponsorToken,
} from "@/lib/move-os/sponsor";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return withRequestLog(request, { route: "/api/sponsor/[token]" }, async () => {
    const { token } = await context.params;
    const link = await resolveSponsorToken(token);
    if (!link) {
      return NextResponse.json({ error: "invalid_or_revoked" }, { status: 404 });
    }
    const dashboard = await buildSponsorDashboard(link.studentId);
    return NextResponse.json({
      sponsorName: link.sponsorName,
      ...dashboard,
    });
  });
}
