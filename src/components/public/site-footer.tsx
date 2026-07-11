import Image from "next/image";
import Link from "next/link";
import { SocialLinks } from "@/components/public/social-links";
import {
  getSiteSettings,
  listFooterCmsPages,
} from "@/lib/collections/site-settings";
import { BRAND_ICON_PATH } from "@/lib/brand";
import { resolveFooterGroups } from "@/lib/public/nav";

export async function SiteFooter() {
  const [settings, cmsPages] = await Promise.all([
    getSiteSettings(),
    listFooterCmsPages(),
  ]);
  const navLabels = settings.navLabels ?? {};
  const groups = resolveFooterGroups(settings.footerLinks, navLabels, cmsPages);
  const siteName = settings.siteName ?? navLabels.siteName ?? "Venturo";
  const socialLinks = settings.socialLinks ?? [];
  const contactEmail = settings.contactEmail?.trim() ?? "";
  const description =
    settings.siteDescription?.trim() || settings.tagline?.trim() || "";

  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="page-container mx-auto flex w-full max-w-page flex-col gap-8 py-10 md:flex-row md:justify-between">
        <div className="max-w-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <Image
              src={BRAND_ICON_PATH}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-radius-sm object-cover"
              aria-hidden
            />
            <span className="font-serif text-lg font-semibold text-text-primary">
              {siteName}
            </span>
          </div>
          {description ? (
            <p className="text-sm text-text-secondary">{description}</p>
          ) : null}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="block text-sm text-text-secondary hover:text-text-primary"
            >
              {contactEmail}
            </a>
          ) : null}
          <SocialLinks
            links={socialLinks}
            platformLabels={settings.formLabels ?? {}}
            className="pt-1"
          />
        </div>

        <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 md:max-w-xl">
          {groups.map((group) => (
            <div key={group.key}>
              {group.label ? (
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                  {group.label}
                </h2>
              ) : null}
              <ul className="mt-4 space-y-2">
                {group.links.map((link) =>
                  link.label ? (
                    <li key={link.key}>
                      <Link
                        href={link.href}
                        className="text-sm text-text-secondary hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
