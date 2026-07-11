"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export function SiteHeaderActions({
  ctaLabel,
  ctaHref,
  languageAriaLabel,
  searchPlaceholder,
}: {
  ctaLabel?: string;
  ctaHref: string;
  languageAriaLabel?: string;
  searchPlaceholder?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <LanguageSwitcher
        ariaLabel={languageAriaLabel}
        searchPlaceholder={searchPlaceholder}
      />
      {ctaLabel ? (
        <Link
          href={ctaHref}
          className="inline-flex min-h-11 items-center justify-center rounded-radius-sm bg-grad-rouse px-3 text-xs font-semibold text-on-gradient hover:opacity-90 sm:px-4 sm:text-sm"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
