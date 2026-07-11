import Image from "next/image";
import Link from "next/link";
import { SiteHeaderActions } from "@/components/public/site-header-actions";
import {
  getSiteSettings,
  listNavCmsPages,
} from "@/lib/collections/site-settings";
import { buildHeaderPrimaryLinks } from "@/lib/public/nav";

export async function SiteHeader() {
  const [settings, cmsPages] = await Promise.all([
    getSiteSettings(),
    listNavCmsPages(),
  ]);
  const navLabels = settings.navLabels ?? {};
  const localeLabels =
    (settings as { localeLabels?: Record<string, string> }).localeLabels ?? {};
  const links = [
    ...buildHeaderPrimaryLinks(navLabels),
    ...cmsPages.map((page) => ({
      key: `cms-${page.slug}`,
      href: `/pages/${page.slug}`,
      label: page.navLabel || page.title,
    })),
  ];
  const siteName = settings.siteName ?? navLabels.siteName;
  const brandMark = settings.brandMark ?? "";
  const ctaLabel = navLabels.headerCta;
  const ctaHref = navLabels.headerCtaHref || "/sign-up";

  return (
    <header className="border-b border-border bg-bg">
      <div className="page-container mx-auto flex w-full max-w-page items-center justify-between gap-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={siteName ?? ""}
              width={140}
              height={40}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <>
              {brandMark ? (
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-radius-sm bg-fill-accent font-sans text-xs font-semibold text-on-accent"
                >
                  {brandMark}
                </span>
              ) : null}
              {siteName ? (
                <span className="font-serif text-lg text-text-primary">
                  {siteName}
                </span>
              ) : null}
            </>
          )}
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center gap-6 md:flex"
          aria-label="primary"
        >
          {links.map((link) =>
            link.label ? (
              <Link
                key={link.key}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ) : null,
          )}
        </nav>

        <SiteHeaderActions
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          languageAriaLabel={localeLabels.languageAriaLabel}
          searchPlaceholder={localeLabels.searchPlaceholder}
        />
      </div>

      <nav
        className="page-container mx-auto flex w-full max-w-page gap-1 overflow-x-auto border-t border-border [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="primary-mobile"
      >
        {links.map((link) =>
          link.label ? (
            <Link
              key={link.key}
              href={link.href}
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm text-text-secondary"
            >
              {link.label}
            </Link>
          ) : null,
        )}
      </nav>
    </header>
  );
}
