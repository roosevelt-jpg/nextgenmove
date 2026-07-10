import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/admin/dashboard";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  const items = await getRecentActivity(Number.isFinite(limit) ? limit : 20);
  return NextResponse.json({ items });
}
