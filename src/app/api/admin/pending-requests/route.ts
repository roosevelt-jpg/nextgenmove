import { NextResponse } from "next/server";
import { getPendingRequests } from "@/lib/admin/dashboard";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const items = await getPendingRequests();
  return NextResponse.json({ items });
}
