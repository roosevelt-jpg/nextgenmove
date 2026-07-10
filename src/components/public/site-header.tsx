import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { buildHeaderPrimaryLinks } from "@/lib/public/nav";

export async function SiteHeader() {
  const settings = await getSiteSettings();
  const navLabels = settings.navLabels ?? {};
  const links = buildHeaderPrimaryLinks(navLabels);
  const siteName = settings.siteName ?? navLabels.siteName;
  const ctaLabel = navLabels.headerCta;
  const ctaHref = navLabels.headerCtaHref || "/sign-up";

  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={siteName ?? "site-logo"}
              width={140}
              height={40}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <>
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-radius-sm bg-fill-accent font-sans text-xs font-semibold text-on-accent"
              >
                NG
              </span>
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

        {ctaLabel ? (
          <Link
            href={ctaHref}
            className="inline-flex shrink-0 items-center justify-center rounded-radius-sm bg-fill-primary px-3 py-2 text-xs font-semibold text-on-primary hover:opacity-90 sm:px-4 sm:text-sm"
          >
            {ctaLabel}
          </Link>
        ) : (
          <span className="w-24" aria-hidden />
        )}
      </div>

      <nav
        className="flex gap-4 overflow-x-auto border-t border-border px-4 py-3 md:hidden"
        aria-label="primary-mobile"
      >
        {links.map((link) =>
          link.label ? (
            <Link
              key={link.key}
              href={link.href}
              className="whitespace-nowrap text-sm text-text-secondary"
            >
              {link.label}
            </Link>
          ) : null,
        )}
      </nav>
    </header>
  );
}
