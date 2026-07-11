"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { AuthLabels } from "@/types/user";

export interface ForgotPasswordFormProps {
  labels: AuthLabels;
}

export function ForgotPasswordForm({ labels }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 py-4">
      {labels.forgotPasswordTitle ? (
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.forgotPasswordTitle}
        </h1>
      ) : null}
      {labels.forgotPasswordIntro ? (
        <p className="text-sm text-text-secondary">{labels.forgotPasswordIntro}</p>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          label={labels.emailLabel}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {status === "sent" ? (
          <p className="text-sm text-text-success" role="status">
            {labels.forgotPasswordSent}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels.genericErrorLabel}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {labels.forgotPasswordSubmit}
        </Button>
      </form>

      <Link href="/sign-in" className="text-sm text-text-secondary hover:text-text-primary">
        {labels.signInLinkLabel ?? "Sign in"}
      </Link>
    </div>
  );
}
