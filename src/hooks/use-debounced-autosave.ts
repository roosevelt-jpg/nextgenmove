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
 * Use `flush()` for an immediate Save button persist (cancels pending debounce).
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
  const valueRef = useRef(value);
  const skipRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const runIdRef = useRef(0);
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const suppressNext = useCallback(() => {
    skipRef.current = true;
  }, []);

  const runPersist = useCallback(async (next: T) => {
    const runId = ++runIdRef.current;
    setStatus("saving");
    try {
      const result = await persistRef.current(next);
      if (runId !== runIdRef.current) return result;
      if (result === "skipped") {
        setStatus("idle");
      } else {
        setStatus(result ? "saved" : "error");
      }
      return result;
    } catch {
      if (runId !== runIdRef.current) return false;
      setStatus("error");
      return false;
    }
  }, []);

  const flush = useCallback(async () => {
    if (!enabled) return false;
    const next = valueRef.current;
    if (next == null) return false;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const result = await runPersist(next);
    return result === true;
  }, [enabled, runPersist]);

  useEffect(() => {
    if (!enabled || value == null) {
      return;
    }

    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runPersist(value);
    }, delayMs);

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, enabled, delayMs, runPersist]);

  return { status, suppressNext, setStatus, flush };
}
