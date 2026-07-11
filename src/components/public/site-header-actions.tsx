"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function SiteHeaderActions({
  ctaLabel,
  ctaHref,
  languageAriaLabel,
  searchPlaceholder,
  themeLightLabel,
  themeDarkLabel,
}: {
  ctaLabel?: string;
  ctaHref: string;
  languageAriaLabel?: string;
  searchPlaceholder?: string;
  themeLightLabel?: string;
  themeDarkLabel?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle
        lightLabel={themeLightLabel}
        darkLabel={themeDarkLabel}
      />
      <LanguageSwitcher
        ariaLabel={languageAriaLabel}
        searchPlaceholder={searchPlaceholder}
      />
      {ctaLabel ? (
        <Link
          href={ctaHref}
          className="btn-brand px-2.5 text-[11px] sm:px-3 sm:text-xs"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
