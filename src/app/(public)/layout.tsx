import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { CookieConsentBanner } from "@/components/public/cookie-consent-banner";
import { PublicContentProtection } from "@/components/public/public-content-protection";
import { TalentConnectionsBg } from "@/components/public/talent-connections-bg";
import { NgmAssistantWidget } from "@/components/assistant/ngm-assistant-widget";
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
  const assistantLabels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminPageLabels?.publicChat ?? {}),
  };

  return (
    <PublicContentProtection>
      <div className="relative flex min-h-screen flex-col">
        <TalentConnectionsBg />
        <SiteHeader />
        <main className="relative z-0 w-full min-w-0 flex-1 overflow-x-hidden">
          {children}
        </main>
        <SiteFooter />
        <CookieConsentBanner
          siteName={settings.siteName || "Nextgenmove"}
          message={cookieLabels.cookieMessage}
          acceptLabel={cookieLabels.cookieAccept || "Accept"}
          declineLabel={cookieLabels.cookieDecline || "Decline"}
          privacyHref={cookieLabels.cookiePrivacyHref || "/privacy"}
          privacyLabel={cookieLabels.cookiePrivacyLabel || "Privacy"}
        />
        <NgmAssistantWidget publicMode labels={assistantLabels} />
      </div>
    </PublicContentProtection>
  );
}
