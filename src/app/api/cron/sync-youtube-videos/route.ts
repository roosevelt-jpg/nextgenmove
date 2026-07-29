import { NextResponse } from "next/server";
import { syncYoutubePlaylistVideos } from "@/lib/media/youtube-sync";
import { withRequestLog } from "@/lib/observability/api-handler";

/**
 * Hourly YouTube channel/playlist → video_cards sync (auto-pull new uploads).
 * Homepage Stories rotates a daily window from this library; marquee keeps moving.
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/cron/sync-youtube-videos" }, async () => {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = request.headers.get("authorization") ?? "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await syncYoutubePlaylistVideos();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  });
}

export async function POST(request: Request) {
  return GET(request);
}
