export const THEME_STORAGE_KEY = "ngm-theme";

export type ThemeMode = "light" | "dark";

/**
 * Public marketing defaults to light so the branded hero stays readable.
 * Dark is opt-in via the header toggle (or an explicit prior choice).
 */
export function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

/** Inline script — runs before paint to avoid light/dark flash. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d=s==="dark";document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
