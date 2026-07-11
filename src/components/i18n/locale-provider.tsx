"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  isRtlLocale,
  LOCALE_COOKIE,
  normalizeLocale,
} from "@/lib/i18n/locales";

interface LocaleContextValue {
  locale: string;
  setLocale: (next: string) => void;
  dir: "ltr" | "rtl";
  translateLabels: <T extends Record<string, string>>(
    labels: T,
  ) => Promise<T>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeLocaleCookie(locale: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${maxAge};samesite=lax`;
}

function readLocaleCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`),
  );
  return normalizeLocale(
    match?.[1] ? decodeURIComponent(match[1]) : undefined,
  );
}

const memoryCache = new Map<string, string>();

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: string;
}) {
  const [locale, setLocaleState] = useState(() =>
    normalizeLocale(initialLocale),
  );

  useEffect(() => {
    const fromCookie = readLocaleCookie();
    if (fromCookie !== locale) {
      setLocaleState(fromCookie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from cookie once
  }, []);

  useEffect(() => {
    const base = normalizeLocale(locale);
    document.documentElement.lang = base;
    document.documentElement.dir = isRtlLocale(base) ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((next: string) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);
    writeLocaleCookie(normalized);
    void fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLocale: normalized }),
    }).catch(() => {
      /* guest or unauthenticated — cookie is enough */
    });
  }, []);

  const translateLabels = useCallback(
    async <T extends Record<string, string>>(labels: T): Promise<T> => {
      const target = normalizeLocale(locale).split("-")[0]!;
      if (target === "en") return labels;

      const entries = Object.entries(labels).filter(
        ([, v]) => typeof v === "string" && v.trim().length > 0,
      );
      if (!entries.length) return labels;

      const missing: string[] = [];
      const resolved = new Map<string, string>();

      for (const [, text] of entries) {
        const key = `${target}:${text}`;
        const cached = memoryCache.get(key);
        if (cached != null) {
          resolved.set(text, cached);
        } else {
          missing.push(text);
        }
      }

      if (missing.length) {
        const unique = [...new Set(missing)];
        const response = await fetch("/api/i18n/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, texts: unique }),
        });
        if (response.ok) {
          const payload = (await response.json()) as {
            translated: string[];
          };
          unique.forEach((src, i) => {
            const dst = payload.translated[i] ?? src;
            memoryCache.set(`${target}:${src}`, dst);
            resolved.set(src, dst);
          });
        }
      }

      const out = { ...labels };
      for (const [key, text] of entries) {
        out[key as keyof T] = (resolved.get(text) ?? text) as T[keyof T];
      }
      return out;
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      dir: isRtlLocale(locale) ? ("rtl" as const) : ("ltr" as const),
      translateLabels,
    }),
    [locale, setLocale, translateLabels],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Optional hook that returns English labels when outside provider. */
export function useLocaleOptional() {
  return useContext(LocaleContext);
}
