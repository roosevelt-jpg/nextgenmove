import Link from "next/link";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { resolveFooterGroups } from "@/lib/public/nav";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const navLabels = settings.navLabels ?? {};
  const groups = resolveFooterGroups(settings.footerLinks, navLabels);

  return (
    <footer className="mt-auto border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.key}>
            {group.label ? (
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
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
      {settings.tagline ? (
        <div className="border-t border-border px-4 py-4 text-center text-sm text-text-muted">
          {settings.tagline}
        </div>
      ) : null}
    </footer>
  );
}
