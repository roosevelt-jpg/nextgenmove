import Link from "next/link";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { resolveFooterGroups } from "@/lib/public/nav";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const navLabels = settings.navLabels ?? {};
  const groups = resolveFooterGroups(settings.footerLinks, navLabels);
  const siteName = settings.siteName ?? navLabels.siteName;

  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 md:flex-row md:justify-between">
        <div className="max-w-xs space-y-3">
          <div className="flex items-center gap-2.5">
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
          </div>
          {settings.tagline ? (
            <p className="text-sm text-text-secondary">{settings.tagline}</p>
          ) : null}
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
