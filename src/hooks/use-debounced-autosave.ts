"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "skipped";

/**
 * Debounced persist after local state changes.
 * Skips the first run (hydrate) and any run where `enabled` is false.
 * Call `suppressNext()` before applying server responses so they do not re-save.
 * Only sets `saved` when persist resolves to true; failures become `error`.
 * Persist may return `"skipped"` (or callers can return true for validation skips)
 * to avoid a false error state.
 */
export function useDebouncedAutosave<T>(
  value: T | null | undefined,
  persist: (value: T) => Promise<boolean | "skipped">,
  options?: {
    delayMs?: number;
    enabled?: boolean;
  },
) {
  const delayMs = options?.delayMs ?? 650;
  const enabled = options?.enabled ?? true;
  const persistRef = useRef(persist);
  const skipRef = useRef(true);
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const suppressNext = useCallback(() => {
    skipRef.current = true;
  }, []);

  useEffect(() => {
    if (!enabled || value == null) {
      return;
    }

    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setStatus("saving");
        try {
          const result = await persistRef.current(value);
          if (cancelled) return;
          if (result === "skipped") {
            setStatus("idle");
          } else {
            setStatus(result ? "saved" : "error");
          }
        } catch {
          if (cancelled) return;
          setStatus("error");
        }
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, enabled, delayMs]);

  return { status, suppressNext, setStatus };
}
