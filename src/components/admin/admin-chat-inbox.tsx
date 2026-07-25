"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Textarea } from "@/components/ui";

interface ThreadItem {
  id: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
  lastMessage?: string;
  status?: string;
  updatedAt?: string | null;
}

interface ChatMessage {
  id: string;
  role: string;
  text: string;
  createdAt?: string | null;
}

export function AdminChatInbox({ labels }: { labels: Record<string, string> }) {
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/chat-threads", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { items?: ThreadItem[] };
      setItems(payload.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void fetch(`/api/admin/chat-threads/${selectedId}`)
      .then((r) => r.json())
      .then((payload: { messages?: ChatMessage[] }) => {
        setMessages(payload.messages ?? []);
      });
  }, [selectedId]);

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    await fetch("/api/admin/chat-threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: selectedId, message: reply.trim() }),
    });
    setReply("");
    setBusy(false);
    const detail = await fetch(`/api/admin/chat-threads/${selectedId}`);
    if (detail.ok) {
      const payload = (await detail.json()) as { messages?: ChatMessage[] };
      setMessages(payload.messages ?? []);
    }
    await load();
  };

  if (loading) {
    return <p className="text-sm text-text-muted">{labels.loading || "Loading…"}</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <ul className="space-y-1 rounded-radius border border-border">
        {!items.length ? (
          <li className="p-3 text-sm text-text-muted">
            {labels.empty || "No chat threads yet."}
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={
                  selectedId === item.id
                    ? "w-full border-b border-border bg-surface-2 px-3 py-2 text-left"
                    : "w-full border-b border-border px-3 py-2 text-left hover:bg-surface-2"
                }
                onClick={() => setSelectedId(item.id)}
              >
                <p className="text-sm font-medium text-text-primary">
                  {item.visitorName || item.visitorEmail || item.id.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {item.lastMessage}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-3 rounded-radius border border-border p-4">
        {!selectedId ? (
          <p className="text-sm text-text-muted">
            {labels.selectThread || "Select a thread"}
          </p>
        ) : (
          <>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="rounded-radius-sm bg-surface-2 p-2 text-sm">
                  <p className="font-mono text-[10px] uppercase text-text-muted">
                    {msg.role}
                  </p>
                  <p className="text-text-primary">{msg.text}</p>
                </div>
              ))}
            </div>
            <Textarea
              label={labels.replyLabel || "Reply"}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
            />
            <Button disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
              {labels.sendReply || "Send reply"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
