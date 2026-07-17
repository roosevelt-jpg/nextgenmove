import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { CookieConsentBanner } from "@/components/public/cookie-consent-banner";
import { getSiteSettings } from "@/lib/collections/site-settings";

/** Cache public shell for 60s — pairs with Firestore TTL caches. */
export const revalidate = 60;

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const cookieLabels = settings.formLabels ?? {};

  return (
    <>
      <SiteHeader />
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
      <CookieConsentBanner
        siteName={settings.siteName || "Venturo"}
        message={cookieLabels.cookieMessage}
        acceptLabel={cookieLabels.cookieAccept || "Accept"}
        declineLabel={cookieLabels.cookieDecline || "Decline"}
        privacyHref={cookieLabels.cookiePrivacyHref || "/privacy"}
        privacyLabel={cookieLabels.cookiePrivacyLabel || "Privacy"}
      />
    </>
  );
}
