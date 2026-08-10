"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface NewsletterFormProps {
  labels: Record<string, string>;
  layout?: "stack" | "inline" | "compact";
  /** When true, show optional corridor preference field. */
  showCorridor?: boolean;
  /** Dark footer styling (on-gradient). */
  tone?: "default" | "onDark";
  className?: string;
}

export function NewsletterForm({
  labels,
  layout = "stack",
  showCorridor = false,
  tone = "default",
  className,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [corridor, setCorridor] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const trimmedCorridor = corridor.trim();
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(trimmedCorridor ? { corridor: trimmedCorridor } : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "subscribe_failed");
      }

      setIsSubmitted(true);
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "subscribe_failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDark = tone === "onDark";
  const inputClass = onDark
    ? "min-h-9 border-white/30 bg-white/10 py-2 text-on-gradient placeholder:text-on-gradient/50 focus:border-white/50 focus:ring-white/20"
    : undefined;
  const labelClass = onDark ? "text-on-gradient/70" : undefined;
  const submitLabel =
    labels.newsletterSubmit ?? labels.subscribe ?? labels.submit;

  if (isSubmitted) {
    return labels.successMessage ? (
      <p
        className={cn(
          "text-sm",
          onDark ? "text-on-gradient/90" : "text-text-success",
        )}
      >
        {labels.successMessage}
      </p>
    ) : null;
  }

  if (layout === "compact") {
    return (
      <form
        className={cn("flex w-full max-w-xl flex-col gap-2", className)}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            id="newsletter-email"
            type="email"
            required
            aria-label={labels.email ?? "email"}
            label={labels.email}
            labelClassName={labelClass}
            placeholder={labels.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={cn("min-w-0 flex-1", inputClass)}
          />
          {showCorridor && labels.corridorLabel ? (
            <Input
              id="newsletter-corridor"
              type="text"
              aria-label={labels.corridorLabel}
              label={labels.corridorLabel}
              labelClassName={labelClass}
              value={corridor}
              onChange={(event) => setCorridor(event.target.value)}
              className={cn("min-w-0 flex-1", inputClass)}
            />
          ) : null}
          <Button
            type="submit"
            disabled={isSubmitting}
            size="sm"
            className={cn(
              "min-h-9 shrink-0 px-3",
              onDark &&
                "border-transparent bg-white text-fill-brand hover:bg-white/90",
            )}
          >
            {submitLabel}
          </Button>
        </div>
        {errorCode ? (
          <p
            className={cn(
              "text-xs",
              onDark ? "text-amber-200" : "text-text-warning",
            )}
            role="alert"
          >
            {labels[errorCode] ?? labels.genericError ?? errorCode}
          </p>
        ) : null}
      </form>
    );
  }

  const corridorField =
    showCorridor && labels.corridorLabel ? (
      <Input
        id="newsletter-corridor"
        type="text"
        aria-label={labels.corridorLabel}
        label={labels.corridorLabel}
        value={corridor}
        onChange={(event) => setCorridor(event.target.value)}
      />
    ) : null;

  if (layout === "inline") {
    const title = labels.newsletterTitle ?? labels.title;
    const subtitle = labels.newsletterSubtitle ?? labels.subtitle;
    return (
      <form
        className={cn(
          "flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between",
          className,
        )}
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          {title ? (
            <h3 className="font-serif text-2xl text-text-primary">{title}</h3>
          ) : null}
          {subtitle ? (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            id="newsletter-email"
            type="email"
            required
            aria-label={labels.email ?? "email"}
            label={labels.email}
            placeholder={labels.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {corridorField}
          <Button type="submit" disabled={isSubmitting} className="shrink-0">
            {submitLabel}
          </Button>
        </div>
        {errorCode ? (
          <p className="text-sm text-text-warning md:col-span-2" role="alert">
            {labels[errorCode] ?? labels.genericError ?? errorCode}
          </p>
        ) : null}
      </form>
    );
  }

  const title = labels.newsletterTitle ?? labels.title;

  return (
    <form
      className={cn("flex max-w-md flex-col gap-3", className)}
      onSubmit={handleSubmit}
    >
      {title ? (
        <h3 className="font-serif text-xl text-text-primary">{title}</h3>
      ) : null}
      <Input
        id="newsletter-email"
        type="email"
        required
        aria-label={labels.email ?? "email"}
        label={labels.email}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {corridorField}
      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError ?? errorCode}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
