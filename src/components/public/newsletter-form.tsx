"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export interface NewsletterFormProps {
  labels: Record<string, string>;
  layout?: "stack" | "inline";
}

export function NewsletterForm({
  labels,
  layout = "stack",
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  if (isSubmitted) {
    return labels.successMessage ? (
      <p className="text-sm text-text-success">{labels.successMessage}</p>
    ) : null;
  }

  if (layout === "inline") {
    return (
      <form
        className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          {labels.title ? (
            <h3 className="font-serif text-2xl text-text-primary">{labels.title}</h3>
          ) : null}
          {labels.subtitle ? (
            <p className="text-sm text-text-secondary">{labels.subtitle}</p>
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
          <Button type="submit" disabled={isSubmitting} className="shrink-0">
            {labels.submit}
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

  return (
    <form className="flex max-w-md flex-col gap-3" onSubmit={handleSubmit}>
      {labels.title ? (
        <h3 className="font-serif text-xl text-text-primary">{labels.title}</h3>
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
      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError ?? errorCode}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {labels.submit}
      </Button>
    </form>
  );
}
