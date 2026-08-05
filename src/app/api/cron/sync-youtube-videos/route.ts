import { NextResponse } from "next/server";
import { syncYoutubePlaylistVideos } from "@/lib/media/youtube-sync";
import { withRequestLog } from "@/lib/observability/api-handler";

/**
 * Hourly YouTube channel → video_cards sync so new uploads appear on the site.
 * Auth: Authorization Bearer CRON_SECRET, or Vercel Cron header in production.
 */
function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  if (secret && auth === `Bearer ${secret}`) return true;
  // Vercel Cron sends this header on scheduled invocations.
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/cron/sync-youtube-videos" },
    async () => {
      if (!isAuthorizedCron(request)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }

      const result = await syncYoutubePlaylistVideos();
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    },
  );
}

export async function POST(request: Request) {
  return GET(request);
}
