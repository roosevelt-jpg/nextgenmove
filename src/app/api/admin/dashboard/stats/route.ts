import { NextResponse } from "next/server";
import { getAdminDashboardStats } from "@/lib/admin/dashboard";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const stats = await getAdminDashboardStats();
  return NextResponse.json({ stats });
}
