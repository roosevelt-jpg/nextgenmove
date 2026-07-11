"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { establishSession, signInWithEmail } from "@/lib/auth-client";
import { resolvePostAuthRedirect } from "@/lib/auth/constants";
import type { AuthLabels } from "@/types/user";

export interface SignInFormProps {
  labels: AuthLabels;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.8H12z"
      />
    </svg>
  );
}

export function SignInForm({ labels }: SignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmail(email.trim(), password);
      const idToken = await credential.user.getIdToken();
      const session = await establishSession(idToken);
      const nextPath = searchParams.get("next");
      router.push(resolvePostAuthRedirect(session.role, nextPath));
      router.refresh();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      const message =
        error instanceof Error ? error.message : "sign_in_failed";
      if (code.startsWith("auth/")) {
        setErrorCode(code);
      } else if (message && message !== "sign_in_failed") {
        setErrorCode(message);
      } else {
        setErrorCode("sign_in_failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1.5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.signInEyebrow ?? "Welcome back"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight text-text-primary">
          {labels.signInTitle ?? "Sign in to your account."}
        </h1>
        {labels.signInSubtitle ? (
          <p className="text-sm text-text-secondary">{labels.signInSubtitle}</p>
        ) : null}
      </header>

      <button
        type="button"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-radius-sm border border-border bg-surface-1 text-[13px] font-semibold text-text-primary hover:bg-surface-2"
        onClick={() => setErrorCode("google_coming_soon")}
      >
        <GoogleIcon />
        {labels.continueWithGoogle ?? "Continue with Google"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {labels.orDivider ?? "Or"}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <Input
          id="sign-in-email"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
          placeholder={labels.emailPlaceholder ?? "you@email.com"}
          aria-label={labels.emailLabel ?? "email"}
          label={labels.emailLabel}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          required
          aria-label={labels.passwordLabel ?? "password"}
          label={labels.passwordLabel}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[13px] font-semibold text-fill-accent hover:opacity-80"
          >
            {labels.forgotPasswordLinkLabel ?? "Forgot password?"}
          </Link>
        </div>

        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode as keyof AuthLabels] ??
              errorCode ??
              labels.genericErrorLabel}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
          {labels.signInSubmitLabel ?? "Sign in"}
        </Button>
      </form>

      <p className="text-center text-[13px] text-text-secondary">
        {labels.signUpPrompt ?? "Don't have an account?"}{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-fill-accent hover:opacity-80"
        >
          {labels.signUpLinkShort ?? "Sign up"}
        </Link>
      </p>
    </div>
  );
}
