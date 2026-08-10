import { MarketplacePublicView } from "@/components/public/marketplace-public-view";
import { getPageMarketplace } from "@/lib/collections/pages";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const page = await getPageMarketplace();
  return <MarketplacePublicView page={page} />;
}
