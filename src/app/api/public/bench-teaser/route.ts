import { NextResponse } from "next/server";
import { getBenchTeaser } from "@/lib/public/bench-teaser";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/public/bench-teaser" },
    async () => {
      const payload = await getBenchTeaser();
      return NextResponse.json(
        {
          readyCount: payload.readyCount,
          corridors: payload.corridors,
          generatedAt: payload.generatedAt,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    },
  );
}
