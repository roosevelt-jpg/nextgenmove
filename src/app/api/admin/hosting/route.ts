import { NextResponse } from "next/server";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import {
  ensureHostingCatalogSeeded,
  getHostingCatalog,
} from "@/lib/billing/hosting-catalog";
import { isHostingStripeLive } from "@/lib/billing/stripe-hosting";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  await ensureHostingCatalogSeeded().catch(() => undefined);

  const [catalog, stripeLive] = await Promise.all([
    getHostingCatalog(),
    isHostingStripeLive(),
  ]);

  return NextResponse.json({
    catalog,
    stripeLive,
  });
}
