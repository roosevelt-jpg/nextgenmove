"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "model" | "admin"; text: string };

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
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const title =
    labels.assistantTitle ??
    (publicMode ? "Chat with us" : "NGM Assistant");
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

  useEffect(() => {
    if (!publicMode || !threadId || !open) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/public/chat?threadId=${encodeURIComponent(threadId)}`,
          { cache: "no-store" },
        );
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          messages?: Array<{ role: string; text: string }>;
        };
        const next = (payload.messages ?? []).map((message) => {
          const role =
            message.role === "user"
              ? "user"
              : message.role === "admin"
                ? "admin"
                : "model";
          return { role, text: message.text } as ChatTurn;
        });
        if (!cancelled && next.length) setTurns(next);
      } catch {
        // ignore poll errors
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [publicMode, threadId, open]);

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
      const history = turns
        .filter((turn) => turn.role === "user" || turn.role === "model")
        .slice(-10)
        .map((turn) => ({
          role: turn.role === "user" ? ("user" as const) : ("model" as const),
          text: turn.text,
        }));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          ...(publicMode && threadId ? { threadId } : {}),
          ...(publicMode && visitorName.trim()
            ? { visitorName: visitorName.trim() }
            : {}),
          ...(publicMode && visitorEmail.trim()
            ? { visitorEmail: visitorEmail.trim() }
            : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        reply?: string;
        threadId?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        const code = payload?.error ?? "chat_failed";
        const fallback =
          code === "gemini_not_configured"
            ? "Assistant is not configured yet. Connect Gemini under Integrations."
            : code === "gemini_invalid_key"
              ? "Gemini API key was rejected. Re-save the key under Integrations."
              : code === "gemini_model_unavailable"
                ? "Gemini model is unavailable. Try again shortly."
                : code === "gemini_quota_exhausted"
                  ? "Gemini credits are depleted. Add billing/credits in Google AI Studio, then try again."
                  : code === "gemini_empty_response"
                    ? "Gemini returned an empty reply. Try again in a moment."
                    : "Could not send message. Try again.";
        setError(labels[code] ?? labels.assistantError ?? fallback);
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

          {publicMode ? (
            <div className="grid grid-cols-2 gap-2 border-b border-border px-3 py-2">
              <input
                value={visitorName}
                onChange={(event) => setVisitorName(event.target.value)}
                placeholder={labels.visitorNamePlaceholder ?? "Your name"}
                className="rounded-radius-sm border border-border bg-bg px-2 py-1 text-[11px] text-text-primary outline-none"
              />
              <input
                value={visitorEmail}
                onChange={(event) => setVisitorEmail(event.target.value)}
                placeholder={labels.visitorEmailPlaceholder ?? "Email (optional)"}
                type="email"
                className="rounded-radius-sm border border-border bg-bg px-2 py-1 text-[11px] text-text-primary outline-none"
              />
            </div>
          ) : null}

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
                      : turn.role === "admin"
                        ? "mr-auto border border-fill-accent/30 bg-bg-purple text-text-primary"
                        : "mr-auto bg-surface-2 text-text-primary",
                  )}
                >
                  {turn.role === "admin" ? (
                    <p className="mb-0.5 font-mono text-[9px] uppercase tracking-wide text-text-label">
                      {labels.staffReplyLabel ?? "Staff"}
                    </p>
                  ) : null}
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
