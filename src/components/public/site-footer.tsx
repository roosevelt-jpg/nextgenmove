import Image from "next/image";
import Link from "next/link";
import { SocialLinks } from "@/components/public/social-links";
import {
  getSiteSettings,
  listFooterCmsPages,
} from "@/lib/collections/site-settings";
import { BRAND_ICON_PATH } from "@/lib/brand";
import { resolveFooterGroups } from "@/lib/public/nav";

function resolveCopyright(
  template: string | undefined,
  siteName: string,
  year: number,
): string {
  const raw = template?.trim();
  if (raw) {
    return raw
      .replaceAll("{year}", String(year))
      .replaceAll("{siteName}", siteName);
  }
  return `© ${year} ${siteName}`;
}

export async function SiteFooter() {
  const [settings, cmsPages] = await Promise.all([
    getSiteSettings(),
    listFooterCmsPages(),
  ]);
  const navLabels = settings.navLabels ?? {};
  const formLabels = settings.formLabels ?? {};
  const groups = resolveFooterGroups(settings.footerLinks, navLabels, cmsPages);
  const siteName = settings.siteName ?? navLabels.siteName ?? "Nextgenmove";
  const socialLinks = settings.socialLinks ?? [];
  const contactEmail = settings.contactEmail?.trim() ?? "";
  const description =
    settings.siteDescription?.trim() || settings.tagline?.trim() || "";
  const year = new Date().getFullYear();
  const copyright = resolveCopyright(
    settings.footerCopyright ?? formLabels.footerCopyright,
    siteName,
    year,
  );
  const attributionPrefix =
    settings.footerAttributionPrefix?.trim() ||
    formLabels.footerAttributionPrefix?.trim() ||
    "";
  const attributionName =
    settings.footerAttributionName?.trim() ||
    formLabels.footerAttributionName?.trim() ||
    "";
  const attributionUrl =
    settings.footerAttributionUrl?.trim() ||
    formLabels.footerAttributionUrl?.trim() ||
    "";

  return (
    <footer className="mt-auto bg-grad-rouse text-on-gradient">
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
            <span className="font-serif text-lg font-semibold text-on-gradient">
              {siteName}
            </span>
          </div>
          {description ? (
            <p className="text-sm text-on-gradient/80">{description}</p>
          ) : null}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="block text-sm text-on-gradient/85 transition-opacity hover:text-on-gradient"
            >
              {contactEmail}
            </a>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-8 md:max-w-xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.key}>
                {group.label ? (
                  <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-on-gradient/70">
                    {group.label}
                  </h2>
                ) : null}
                <ul className="mt-4 space-y-2">
                  {group.links.map((link) =>
                    link.label ? (
                      <li key={link.key}>
                        <Link
                          href={link.href}
                          className="text-sm text-on-gradient/85 transition-opacity hover:text-on-gradient"
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

          <SocialLinks
            links={socialLinks}
            platformLabels={formLabels}
            className="justify-end"
            iconClassName="border-white/35 text-on-gradient hover:border-white/60 hover:text-white"
          />
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="page-container mx-auto flex w-full max-w-page flex-col gap-2 py-4 text-sm text-on-gradient/75 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>
          {attributionPrefix && attributionName && attributionUrl ? (
            <p>
              {attributionPrefix}{" "}
              <a
                href={attributionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-on-gradient underline-offset-2 hover:underline"
              >
                {attributionName}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
