import { NextResponse } from "next/server";
import { getCorridorIntelligence } from "@/lib/public/corridor-intelligence";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/public/corridor-intelligence" },
    async () => {
      const payload = await getCorridorIntelligence();
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    },
  );
}
