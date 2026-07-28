import { NextResponse } from "next/server";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import {
  ensureHostingCatalogSeeded,
  getHostingCatalog,
} from "@/lib/billing/hosting-catalog";
import { getHostingSubscription } from "@/lib/billing/hosting-activation";
import { isHostingStripeLive } from "@/lib/billing/stripe-hosting";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  await ensureHostingCatalogSeeded().catch(() => undefined);

  const [catalog, stripeLive, subscription] = await Promise.all([
    getHostingCatalog(),
    isHostingStripeLive(),
    getHostingSubscription(),
  ]);

  return NextResponse.json({
    catalog,
    stripeLive,
    subscription,
    payer: {
      email: session.email ?? null,
      name: "NextGenMove",
    },
  });
}
