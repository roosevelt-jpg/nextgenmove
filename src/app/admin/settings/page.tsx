import { AdminSettingsView } from "@/components/admin/admin-settings-view";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminSiteSettingsPage() {
  const settings = await getSiteSettings();
  const contentLabels = settings.adminPageLabels?.content ?? {};
  const settingsLabels = settings.adminPageLabels?.settings ?? {};
  const labels = {
    ...(settings.formLabels ?? {}),
    ...contentLabels,
    ...settingsLabels,
  };

  return (
    <AdminSettingsView
      labels={labels}
      settings={{
        siteName: settings.siteName,
        tagline: settings.tagline,
        siteDescription: settings.siteDescription,
        brandMark: settings.brandMark,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        defaultMetaTitle: settings.defaultMetaTitle,
        defaultMetaDescription: settings.defaultMetaDescription,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        contactAddress: settings.contactAddress,
        timezone: settings.timezone,
        defaultCurrency: settings.defaultCurrency,
        require2fa: settings.require2fa,
        googleSignInEnabled: settings.googleSignInEnabled,
        sessionExpireDays: settings.sessionExpireDays,
        operatorPlanLabel: settings.operatorPlanLabel,
        operatorPlanDetail: settings.operatorPlanDetail,
        billingManageUrl: settings.billingManageUrl,
        youtubePlaylistUrl: settings.youtubePlaylistUrl,
        youtubeSyncEnabled: settings.youtubeSyncEnabled,
        youtubeHomepageLimit: settings.youtubeHomepageLimit,
        youtubeLibraryLimit: settings.youtubeLibraryLimit,
        youtubeLastSyncedAt: settings.youtubeLastSyncedAt,
        youtubeLastSyncError: settings.youtubeLastSyncError,
        socialLinks: settings.socialLinks,
      }}
    />
  );
}
