"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeaderActions({
  ctaLabel,
  ctaHref,
  languageAriaLabel,
  searchPlaceholder,
  themeLightLabel,
  themeDarkLabel,
  onGradient = false,
}: {
  ctaLabel?: string;
  ctaHref: string;
  languageAriaLabel?: string;
  searchPlaceholder?: string;
  themeLightLabel?: string;
  themeDarkLabel?: string;
  onGradient?: boolean;
}) {
  const controlClass = onGradient
    ? "border-white/35 text-on-gradient hover:border-white/60 hover:text-white"
    : undefined;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle
        lightLabel={themeLightLabel}
        darkLabel={themeDarkLabel}
        className={controlClass}
      />
      <LanguageSwitcher
        ariaLabel={languageAriaLabel}
        searchPlaceholder={searchPlaceholder}
        triggerClassName={controlClass}
      />
      {ctaLabel ? (
        <Link
          href={ctaHref}
          className={cn(
            onGradient
              ? "inline-flex min-h-7 items-center justify-center rounded-radius-sm border border-white/45 bg-white/15 px-2.5 text-[11px] font-semibold text-on-gradient transition-colors hover:bg-white/25 sm:px-3 sm:text-xs"
              : "btn-brand px-2.5 text-[11px] sm:px-3 sm:text-xs",
          )}
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
