import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

/** Cache public shell for 60s — pairs with Firestore TTL caches. */
export const revalidate = 60;

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </>
  );
}
