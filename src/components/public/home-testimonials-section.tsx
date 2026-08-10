"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import type { PageHomeDocument, TestimonialDocument } from "@/types/cms";
import { SectionEyebrow, Button, Input } from "@/components/ui";
import {
  avatarHueForName,
  initialsFromName,
} from "@/lib/avatar-hue";
import { resolveStorageUrl } from "@/lib/storage/file-ref";
import {
  parseYoutubeVideoId,
  youtubeEmbedUrl,
} from "@/lib/media/youtube";
import { ACCEPT_IMAGES } from "@/lib/storage/upload-mime";
import styles from "./home-testimonials-section.module.css";

function buildLoop(items: TestimonialDocument[]): TestimonialDocument[] {
  if (!items.length) return [];
  let sequence = [...items];
  while (sequence.length < 4) {
    sequence = [...sequence, ...items];
  }
  return [...sequence, ...sequence];
}

function Stars({ rating }: { rating: number }) {
  const value = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span className={styles.stars} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < value ? styles.starOn : styles.starOff}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

function Avatar({
  name,
  photo,
}: {
  name: string;
  photo: TestimonialDocument["photo"];
}) {
  const url = resolveStorageUrl(photo);
  const initials = initialsFromName(name);
  const hue = avatarHueForName(name);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={styles.avatarImg} />
    );
  }
  return (
    <span
      className={styles.avatarFallback}
      style={{ background: hue.bg, color: hue.fg }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function TestimonialCard({
  item,
  verifiedLabel,
}: {
  item: TestimonialDocument;
  verifiedLabel?: string;
}) {
  const videoId = item.youtubeVideoId
    ? parseYoutubeVideoId(item.youtubeVideoId) || item.youtubeVideoId
    : item.videoUrl
      ? parseYoutubeVideoId(item.videoUrl)
      : null;

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <Avatar name={item.displayName} photo={item.photo} />
        <div className={styles.cardMeta}>
          <p className={styles.name}>{item.displayName}</p>
          {item.roleLabel ? (
            <p className={styles.role}>{item.roleLabel}</p>
          ) : null}
          <Stars rating={item.rating} />
          {item.verifiedPlacement && verifiedLabel ? (
            <p className="mt-1 font-mono text-[10px] uppercase text-text-success">
              {verifiedLabel}
            </p>
          ) : null}
        </div>
      </div>
      <p className={styles.quote}>“{item.quote}”</p>
      {item.tags && item.tags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-radius-sm bg-bg-purple px-1.5 py-0.5 font-mono text-[9px] uppercase text-fill-accent"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {videoId ? (
        <div className="mt-3 aspect-video overflow-hidden rounded-radius-sm border border-border">
          <iframe
            title={`${item.displayName} testimonial`}
            src={youtubeEmbedUrl(videoId)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </article>
  );
}

export function HomeTestimonialsSection({
  page,
  items,
}: {
  page: PageHomeDocument;
  items: TestimonialDocument[];
}) {
  const formId = useId();
  const [canSubmit, setCanSubmit] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [displayName, setDisplayName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const slider = page.testimonialsSlider ?? {};
  const speedSec = Math.max(20, Number(slider.speedSec ?? 48) || 48);
  const pauseOnHover = slider.pauseOnHover !== false;
  const enabled = slider.enabled !== false;
  const rtl = slider.direction === "rtl";

  const loop = useMemo(() => buildLoop(items), [items]);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/testimonials", { cache: "no-store" });
      if (!res.ok) {
        setCanSubmit(false);
        return;
      }
      const payload = (await res.json()) as {
        canSubmit?: boolean;
        displayName?: string;
      };
      setCanSubmit(Boolean(payload.canSubmit));
      if (payload.displayName) {
        setPrefillName(payload.displayName);
        setDisplayName(payload.displayName);
      }
    } catch {
      setCanSubmit(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("quote", quote);
      form.set("rating", String(rating));
      form.set("displayName", displayName.trim() || prefillName);
      if (photo) form.set("photo", photo);

      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: {
          "Idempotency-Key": `testimonial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        body: form,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage(payload.error || "Could not submit testimonial.");
        return;
      }
      setQuote("");
      setPhoto(null);
      setRating(5);
      setMessage(
        page.testimonialsPendingThanks ||
          "Thanks — your testimonial is pending review.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          {page.testimonialsEyebrow ? (
            <SectionEyebrow>{page.testimonialsEyebrow}</SectionEyebrow>
          ) : null}
          {page.testimonialsHeadline ? (
            <h2 className={styles.headline}>{page.testimonialsHeadline}</h2>
          ) : null}
          {page.testimonialsSubtext ? (
            <p className={styles.subtext}>{page.testimonialsSubtext}</p>
          ) : null}
        </div>
        {page.testimonialsManagedLabel ? (
          <p className={styles.managed}>{page.testimonialsManagedLabel}</p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyBand}>
          <p className={styles.emptyText}>
            {page.testimonialsEmptyText ||
              "Published testimonials will appear here."}
          </p>
        </div>
      ) : (
        <div
          className={`${styles.band} ${pauseOnHover ? styles.pauseOnHover : ""}`}
        >
          <div className={styles.viewport}>
            <div
              className={`${styles.track} ${rtl ? styles.trackRtl : ""}`}
              style={
                {
                  "--testimonials-duration": `${speedSec}s`,
                  animationPlayState: enabled ? undefined : "paused",
                } as CSSProperties
              }
            >
              {loop.map((item, index) => (
                <TestimonialCard
                  key={`${item.id}-${index}`}
                  item={item}
                  verifiedLabel={page.testimonialsVerifiedLabel}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.submitPanel}>
        {canSubmit ? (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Input
              id={`${formId}-name`}
              label={page.testimonialsNameLabel || "Your name"}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {page.testimonialsRatingLabel || "Rating"}
              </span>
              <div className={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      value <= rating ? styles.rateOn : styles.rateOff
                    }
                    aria-label={`${value} stars`}
                    onClick={() => setRating(value)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {page.testimonialsQuoteLabel || "Your testimonial"}
              </span>
              <textarea
                className={styles.textarea}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={4}
                minLength={20}
                maxLength={800}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {page.testimonialsPhotoLabel || "Photo (optional)"}
              </span>
              <input
                type="file"
                accept={ACCEPT_IMAGES}
                className={styles.file}
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button type="submit" disabled={busy || quote.trim().length < 20}>
              {page.testimonialsSubmitCta || "Submit testimonial"}
            </Button>
            {message ? <p className={styles.message}>{message}</p> : null}
          </form>
        ) : (
          <div className={styles.signInBox}>
            <p className={styles.signInPrompt}>
              {page.testimonialsSignInPrompt ||
                "Sign in as a student or employer to share your experience."}
            </p>
            <Link href="/sign-in?next=/" className="btn-base btn-ink">
              {page.testimonialsSignInCta || "Sign in to post"}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
