"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { ACCEPT_IMAGES } from "@/lib/storage/upload-mime";

export function StudentTalentStoryOptIn({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const [canSubmit, setCanSubmit] = useState(false);
  const [quote, setQuote] = useState("");
  const [corridor, setCorridor] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/student/talent-stories", {
        cache: "no-store",
      });
      if (!res.ok) {
        setCanSubmit(false);
        return;
      }
      const payload = (await res.json()) as { canSubmit?: boolean };
      setCanSubmit(Boolean(payload.canSubmit));
    } catch {
      setCanSubmit(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded || !canSubmit) return null;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("quote", quote);
      if (corridor.trim()) form.set("corridor", corridor.trim());
      if (youtubeVideoId.trim()) {
        form.set("youtubeVideoId", youtubeVideoId.trim());
      }
      if (photo) form.set("photo", photo);

      const res = await fetch("/api/student/talent-stories", {
        method: "POST",
        headers: {
          "Idempotency-Key": `talent-story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        body: form,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage(
          labels.talentStorySubmitError ||
            payload.error ||
            "Could not submit story.",
        );
        return;
      }
      setQuote("");
      setCorridor("");
      setYoutubeVideoId("");
      setPhoto(null);
      setMessage(
        labels.talentStoryPendingThanks ||
          "Thanks — your story is pending review.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dashboard-panel--student space-y-3 rounded-radius border p-4">
      <h2 className="text-[14px] font-semibold text-text-primary">
        {labels.talentStoryTitle || "Share your talent story"}
      </h2>
      <p className="text-sm text-text-secondary">
        {labels.talentStoryBody ||
          "Placed talent can opt in to publish a quote on the public site."}
      </p>
      <label className="block space-y-1">
        <span className="text-xs text-text-muted">
          {labels.talentStoryQuoteLabel || "Your quote"}
        </span>
        <textarea
          className="w-full rounded-radius border border-border bg-surface px-3 py-2 text-sm"
          rows={3}
          minLength={20}
          maxLength={800}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
        />
      </label>
      <Input
        label={labels.talentStoryCorridorLabel || "Corridor (optional)"}
        value={corridor}
        onChange={(e) => setCorridor(e.target.value)}
      />
      <Input
        label={labels.talentStoryYoutubeLabel || "YouTube URL or id (optional)"}
        value={youtubeVideoId}
        onChange={(e) => setYoutubeVideoId(e.target.value)}
      />
      <label className="block space-y-1">
        <span className="text-xs text-text-muted">
          {labels.talentStoryPhotoLabel || "Photo (optional)"}
        </span>
        <input
          type="file"
          accept={ACCEPT_IMAGES}
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>
      <Button
        type="button"
        disabled={busy || quote.trim().length < 20}
        onClick={() => void submit()}
      >
        {labels.talentStorySubmitCta || "Submit story"}
      </Button>
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
    </section>
  );
}
