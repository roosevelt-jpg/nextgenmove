"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getPreferredTheme,
  type ThemeMode,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  lightLabel,
  darkLabel,
}: {
  className?: string;
  lightLabel?: string;
  darkLabel?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const preferred = getPreferredTheme();
    setMode(preferred);
    applyTheme(preferred);
    setReady(true);
  }, []);

  const toggle = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  };

  const aria =
    mode === "dark"
      ? lightLabel || "Switch to light mode"
      : darkLabel || "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex min-h-7 min-w-7 items-center justify-center rounded-radius-sm border border-border text-text-secondary transition-colors hover:text-text-primary",
        className,
      )}
      aria-label={aria}
      title={aria}
      suppressHydrationWarning
      data-ready={ready ? "true" : "false"}
    >
      {mode === "dark" ? (
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="8" cy="8" r="3" />
          <path
            d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M12.5 9.2A5.25 5.25 0 0 1 6.8 3.5 5.5 5.5 0 1 0 12.5 9.2z" />
        </svg>
      )}
    </button>
  );
}
