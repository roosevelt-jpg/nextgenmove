"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "model"; text: string };

export interface NgmAssistantWidgetProps {
  labels?: Record<string, string>;
  /** Use public chat API instead of authenticated assistant. */
  publicMode?: boolean;
  className?: string;
}

export function NgmAssistantWidget({
  labels = {},
  publicMode = false,
  className,
}: NgmAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const title = labels.assistantTitle ?? "NGM Assistant";
  const placeholder =
    labels.assistantPlaceholder ?? "Ask about NextGen Move…";
  const sendLabel = labels.assistantSend ?? "Send";
  const emptyHint =
    labels.assistantEmpty ??
    "Ask about credits, talent pool, Track A/B, or how to get started.";

  useEffect(() => {
    if (!publicMode || typeof window === "undefined") return;
    const stored = window.localStorage.getItem("ngm_public_chat_thread");
    if (stored) setThreadId(stored);
  }, [publicMode]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, open, busy]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;

    setInput("");
    setError(null);
    const nextTurns: ChatTurn[] = [...turns, { role: "user", text: message }];
    setTurns(nextTurns);
    setBusy(true);

    try {
      const endpoint = publicMode
        ? "/api/public/chat"
        : "/api/assistant/chat";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: turns.slice(-10),
          ...(publicMode && threadId ? { threadId } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        reply?: string;
        threadId?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        const code = payload?.error ?? "chat_failed";
        setError(
          labels[code] ??
            labels.assistantError ??
            (code === "gemini_not_configured"
              ? "Assistant is not configured yet."
              : "Could not send message. Try again."),
        );
        return;
      }

      if (publicMode && payload?.threadId) {
        setThreadId(payload.threadId);
        window.localStorage.setItem(
          "ngm_public_chat_thread",
          payload.threadId,
        );
      }

      setTurns([
        ...nextTurns,
        { role: "model", text: payload?.reply ?? "" },
      ]);
    } catch {
      setError(labels.assistantError ?? "Could not send message. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("fixed bottom-4 right-4 z-40", className)}>
      {open ? (
        <div className="mb-3 flex h-[min(28rem,70dvh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-radius-lg border border-border bg-grad-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-label">
                {labels.assistantEyebrow ?? "Assistant"}
              </p>
              <p className="text-sm font-semibold text-text-primary">{title}</p>
            </div>
            <button
              type="button"
              className="rounded-radius-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
              onClick={() => setOpen(false)}
              aria-label={labels.assistantClose ?? "Close"}
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
          >
            {turns.length === 0 ? (
              <p className="text-xs text-text-muted">{emptyHint}</p>
            ) : (
              turns.map((turn, index) => (
                <div
                  key={`${turn.role}-${index}`}
                  className={cn(
                    "max-w-[90%] rounded-radius px-2.5 py-1.5 text-xs leading-relaxed",
                    turn.role === "user"
                      ? "ml-auto bg-fill-accent text-white"
                      : "mr-auto bg-surface-2 text-text-primary",
                  )}
                >
                  {turn.text}
                </div>
              ))
            )}
            {busy ? (
              <p className="text-xs text-text-muted">
                {labels.assistantThinking ?? "Thinking…"}
              </p>
            ) : null}
            {error ? (
              <p className="text-xs text-text-warning" role="status">
                {error}
              </p>
            ) : null}
          </div>

          <form
            className="flex gap-2 border-t border-border p-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              maxLength={2000}
              className="min-w-0 flex-1 rounded-radius-sm border border-border bg-bg px-2 py-1.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-fill-accent"
              aria-label={placeholder}
            />
            <Button size="xs" type="submit" disabled={busy || !input.trim()}>
              {sendLabel}
            </Button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fill-accent px-4 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 transition hover:opacity-95"
        aria-expanded={open}
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]"
          aria-hidden
        >
          ✦
        </span>
        {open
          ? (labels.assistantClose ?? "Close")
          : (labels.assistantButton ?? "NGM Assistant")}
      </button>
    </div>
  );
}
