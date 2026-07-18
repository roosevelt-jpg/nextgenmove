"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ContactSubmissionItem {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  subject?: string;
  message?: string;
  status?: string;
  replyNotes?: string;
  lastReplyAt?: string | null;
  lastReplyPreview?: string | null;
  lastReplySubject?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface AdminContactInboxProps {
  labels: Record<string, string>;
}

function statusLabel(status: string | undefined, labels: Record<string, string>) {
  switch (status) {
    case "read":
      return labels.statusRead;
    case "replied":
      return labels.statusReplied;
    case "archived":
      return labels.statusArchived;
    default:
      return labels.statusNew;
  }
}

export function AdminContactInbox({ labels }: AdminContactInboxProps) {
  const [items, setItems] = useState<ContactSubmissionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyNotes, setReplyNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await fetch("/api/admin/contact-submissions", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("load_failed");
      }
      const payload = (await response.json()) as { items?: ContactSubmissionItem[] };
      const next = payload.items ?? [];
      setItems(next);
      setSelectedId((prev) => {
        if (prev && next.some((item) => item.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } catch {
      setErrorCode("load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setReplySubject("");
      setReplyBody("");
      setReplyNotes("");
      return;
    }
    setReplySubject(
      selected.lastReplySubject ||
        (selected.subject
          ? `${labels.replySubjectPrefix || "Re:"} ${selected.subject}`
          : ""),
    );
    setReplyBody("");
    setReplyNotes(selected.replyNotes ?? "");

    if (selected.status === "new") {
      void fetch(`/api/admin/contact-submissions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      }).then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { item?: ContactSubmissionItem };
        if (payload.item) {
          setItems((prev) =>
            prev.map((item) => (item.id === payload.item!.id ? payload.item! : item)),
          );
        }
      });
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendReply = async () => {
    if (!selected) return;
    setSending(true);
    setErrorCode(null);
    try {
      const response = await fetch(
        `/api/admin/contact-submissions/${selected.id}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: replySubject,
            body: replyBody,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "send_failed");
      }
      const payload = (await response.json()) as { item?: ContactSubmissionItem };
      if (payload.item) {
        setItems((prev) =>
          prev.map((item) => (item.id === payload.item!.id ? payload.item! : item)),
        );
      }
      setReplyBody("");
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "send_failed");
    } finally {
      setSending(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    setErrorCode(null);
    try {
      const response = await fetch(`/api/admin/contact-submissions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyNotes }),
      });
      if (!response.ok) {
        throw new Error("update_failed");
      }
      const payload = (await response.json()) as { item?: ContactSubmissionItem };
      if (payload.item) {
        setItems((prev) =>
          prev.map((item) => (item.id === payload.item!.id ? payload.item! : item)),
        );
      }
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "update_failed");
    } finally {
      setSavingNotes(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    const response = await fetch(`/api/admin/contact-submissions/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { item?: ContactSubmissionItem };
    if (payload.item) {
      setItems((prev) =>
        prev.map((item) => (item.id === payload.item!.id ? payload.item! : item)),
      );
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-text-secondary">
        {labels.loading}
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm text-text-secondary">
        {labels.empty}
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <ul className="max-h-[70vh] space-y-1 overflow-y-auto border-r border-border pr-3">
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full rounded-radius-sm px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-surface-2 text-text-primary"
                    : "hover:bg-surface-1 text-text-secondary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {item.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                    {statusLabel(item.status, labels)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {item.subject}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <div className="space-y-6">
          <header className="space-y-2 border-b border-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-text-primary">
                {selected.subject}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => void setStatus("archived")}
                >
                  {labels.archive}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => void setStatus("new")}
                >
                  {labels.markNew}
                </Button>
              </div>
            </div>
            <dl className="grid gap-1 text-sm text-text-secondary sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                  {labels.from}
                </dt>
                <dd className="text-text-primary">{selected.name}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                  {labels.email}
                </dt>
                <dd>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-text-accent hover:underline"
                  >
                    {selected.email}
                  </a>
                </dd>
              </div>
              {selected.phone ? (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                    {labels.phone}
                  </dt>
                  <dd>
                    <a
                      href={`tel:${String(selected.phone).replace(/\s+/g, "")}`}
                      className="text-text-accent hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {selected.createdAt ? (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                    {labels.received}
                  </dt>
                  <dd>{selected.createdAt}</dd>
                </div>
              ) : null}
            </dl>
          </header>

          <section className="space-y-2">
            {labels.message ? (
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                {labels.message}
              </h3>
            ) : null}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {selected.message}
            </p>
          </section>

          {selected.lastReplyPreview ? (
            <section className="space-y-2 rounded-radius-sm border border-border bg-surface-1 px-3 py-2.5">
              {labels.lastReply ? (
                <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                  {labels.lastReply}
                </h3>
              ) : null}
              <p className="text-sm text-text-secondary">{selected.lastReplyPreview}</p>
            </section>
          ) : null}

          <section className="space-y-3">
            {labels.replyTitle ? (
              <h3 className="font-serif text-lg text-text-primary">{labels.replyTitle}</h3>
            ) : null}
            <Input
              id="contact-reply-subject"
              label={labels.replySubject}
              value={replySubject}
              onChange={(event) => setReplySubject(event.target.value)}
            />
            <Textarea
              id="contact-reply-body"
              rows={6}
              label={labels.replyBody}
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
            />
            <Button
              type="button"
              disabled={sending || !replySubject.trim() || !replyBody.trim()}
              onClick={() => void sendReply()}
            >
              {sending ? labels.sending : labels.sendReply}
            </Button>
          </section>

          <section className="space-y-3">
            <Textarea
              id="contact-reply-notes"
              rows={3}
              label={labels.internalNotes}
              value={replyNotes}
              onChange={(event) => setReplyNotes(event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={savingNotes}
              onClick={() => void saveNotes()}
            >
              {savingNotes ? labels.saving : labels.saveNotes}
            </Button>
          </section>

          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] ?? labels.genericError ?? errorCode}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
