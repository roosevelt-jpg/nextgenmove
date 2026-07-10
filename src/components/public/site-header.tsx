import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { buildHeaderSections } from "@/lib/public/nav";

export async function SiteHeader() {
  const settings = await getSiteSettings();
  const navLabels = settings.navLabels ?? {};
  const sections = buildHeaderSections(navLabels);

  return (
    <header className="border-b border-border bg-surface-1">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={settings.siteName ?? navLabels.siteName ?? "site-logo"}
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
            />
          ) : settings.siteName || navLabels.siteName ? (
            <span className="font-serif text-xl text-text-primary">
              {settings.siteName ?? navLabels.siteName}
            </span>
          ) : null}
        </Link>

        <nav className="flex flex-wrap gap-8" aria-label="primary">
          {sections.map((section) => (
            <div key={section.key} className="flex flex-col gap-2">
              {section.label ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                  {section.label}
                </span>
              ) : null}
              <ul className="flex flex-wrap gap-4">
                {section.links.map((link) =>
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
        </nav>
      </div>
    </header>
  );
}
