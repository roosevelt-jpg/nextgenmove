"use client";

import { useMemo, useState } from "react";
import { listWorldLanguages } from "@/lib/i18n/locales";
import { useLocale } from "@/components/i18n/locale-provider";

export function LanguageSwitcher({
  className,
  searchPlaceholder,
  ariaLabel,
}: {
  className?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
}) {
  const { locale, setLocale } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const languages = useMemo(() => listWorldLanguages(locale), [locale]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (lang) =>
        lang.label.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q),
    );
  }, [languages, query]);

  const current =
    languages.find((l) => l.code === locale.split("-")[0]) ??
    languages.find((l) => l.code === "en");

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <button
        type="button"
        className="inline-flex min-h-11 max-w-[9rem] items-center gap-1.5 rounded-radius-sm border border-border px-2.5 text-[12px] text-text-secondary"
        aria-label={ariaLabel ?? "Language"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
        >
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5c1.6 1.8 2.4 3.6 2.4 5.5S9.6 11.7 8 13.5C6.4 11.7 5.6 9.9 5.6 8S6.4 4.3 8 2.5z" />
        </svg>
        <span className="truncate uppercase">{current?.code ?? "en"}</span>
      </button>

      {open ? (
        <div className="absolute end-0 z-50 mt-1 w-64 rounded-radius border border-border bg-grad-card p-2 shadow-lg">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? "Search languages"}
            className="mb-2 w-full rounded-radius-sm border border-border bg-bg px-2 py-1.5 text-sm text-text-primary"
            autoFocus
          />
          <ul className="max-h-56 overflow-y-auto text-sm">
            {filtered.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  className={
                    lang.code === locale.split("-")[0]
                      ? "flex min-h-11 w-full items-center justify-between rounded-radius-sm bg-surface-2 px-2 py-2 text-start text-text-primary"
                      : "flex min-h-11 w-full items-center justify-between rounded-radius-sm px-2 py-2 text-start text-text-secondary hover:bg-surface-2"
                  }
                  onClick={() => {
                    setLocale(lang.code);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{lang.label}</span>
                  <span className="font-mono text-[10px] uppercase text-text-muted">
                    {lang.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
