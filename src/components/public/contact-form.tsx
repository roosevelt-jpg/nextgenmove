"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";

export interface ContactFormProps {
  labels: Record<string, string>;
}

export function ContactForm({ labels }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          subject,
          message,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "submit_failed");
      }

      setIsSubmitted(true);
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "submit_failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return labels.contactSuccessMessage || labels.formSuccess || labels.successMessage ? (
      <p className="text-sm text-text-success">
        {labels.contactSuccessMessage ||
          labels.formSuccess ||
          labels.successMessage}
      </p>
    ) : null;
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        id="contact-name"
        required
        aria-label={labels.contactFormName ?? "name"}
        label={labels.contactFormName}
        placeholder={labels.contactFormNamePlaceholder}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        id="contact-email"
        type="email"
        required
        aria-label={labels.contactFormEmail ?? "email"}
        label={labels.contactFormEmail}
        placeholder={labels.contactFormEmailPlaceholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="contact-phone"
        type="tel"
        aria-label={labels.contactFormPhone ?? "phone"}
        label={labels.contactFormPhone}
        placeholder={labels.contactFormPhonePlaceholder}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <Input
        id="contact-subject"
        required
        aria-label={labels.contactFormSubject ?? "subject"}
        label={labels.contactFormSubject}
        placeholder={labels.contactFormSubjectPlaceholder}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        id="contact-message"
        required
        rows={5}
        aria-label={labels.contactFormMessage ?? "message"}
        label={labels.contactFormMessage}
        placeholder={labels.contactFormMessagePlaceholder}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />

      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError ?? errorCode}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? labels.submitting || labels.saving
          : labels.contactFormSubmit || labels.submit}
      </Button>
    </form>
  );
}
