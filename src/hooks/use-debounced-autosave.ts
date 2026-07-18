"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced persist after local state changes.
 * Skips the first run (hydrate) and any run where `enabled` is false.
 * Call `suppressNext()` before applying server responses so they do not re-save.
 */
export function useDebouncedAutosave<T>(
  value: T | null | undefined,
  persist: (value: T) => Promise<boolean>,
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
        const ok = await persistRef.current(value);
        if (cancelled) return;
        setStatus(ok ? "saved" : "error");
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, enabled, delayMs]);

  return { status, suppressNext, setStatus };
}
