import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
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
  const ctaLabel = navLabels.headerCta;
  const ctaHref = navLabels.headerCtaHref || "/sign-up";

  return (
    <header className="bg-grad-rouse text-on-gradient">
      <div className="page-container mx-auto flex w-full max-w-page items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="flex h-9 max-w-[148px] shrink-0 items-center overflow-hidden"
        >
          <BrandLogo size="header" priority />
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
                className="text-sm text-on-gradient/80 transition-opacity hover:text-on-gradient hover:opacity-100"
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
          themeLightLabel={localeLabels.themeSwitchToLight}
          themeDarkLabel={localeLabels.themeSwitchToDark}
          onGradient
        />
      </div>

      <nav
        className="page-container mx-auto flex w-full max-w-page gap-1 overflow-x-auto border-t border-white/20 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="primary-mobile"
      >
        {links.map((link) =>
          link.label ? (
            <Link
              key={link.key}
              href={link.href}
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm text-on-gradient/85"
            >
              {link.label}
            </Link>
          ) : null,
        )}
      </nav>
    </header>
  );
}
