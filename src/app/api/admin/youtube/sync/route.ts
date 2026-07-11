import { NextResponse } from "next/server";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import { syncYoutubePlaylistVideos } from "@/lib/media/youtube-sync";
import { withRequestLog } from "@/lib/observability/api-handler";

/** Admin-triggered YouTube playlist sync (same job as the daily cron). */
export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/admin/youtube/sync" }, async () => {
    const session = await getAdminSession();
    if (!session) return unauthorizedResponse();

    const result = await syncYoutubePlaylistVideos();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  });
}
