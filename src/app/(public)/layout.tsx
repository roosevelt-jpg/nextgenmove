import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { PageFrame } from "@/components/layout/page-frame";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PageFrame>
      <SiteHeader />
      <main className="w-full flex-1">{children}</main>
      <SiteFooter />
    </PageFrame>
  );
}
