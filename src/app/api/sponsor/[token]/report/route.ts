import { NextResponse } from "next/server";
import {
  buildSponsorDashboard,
  resolveSponsorToken,
} from "@/lib/move-os/sponsor";
import { buildSponsorProgressHtml } from "@/lib/move-os/sponsor-report";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

/**
 * Family Trust Pack printable progress report.
 * - Default / ?format=html → printable HTML (browser Print → PDF)
 * - ?format=json → dashboard JSON for client-side print
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return withRequestLog(
    request,
    { route: "/api/sponsor/[token]/report" },
    async () => {
      const { token } = await context.params;
      const link = await resolveSponsorToken(token);
      if (!link) {
        return NextResponse.json(
          { error: "invalid_or_revoked" },
          { status: 404 },
        );
      }
      const dashboard = await buildSponsorDashboard(link.studentId);
      const { searchParams } = new URL(request.url);
      const format = (searchParams.get("format") ?? "html").toLowerCase();

      if (format === "json") {
        return NextResponse.json({
          sponsorName: link.sponsorName,
          generatedAt: new Date().toISOString(),
          ...dashboard,
        });
      }

      const html = buildSponsorProgressHtml({
        sponsorName: link.sponsorName,
        dashboard,
      });
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    },
  );
}
