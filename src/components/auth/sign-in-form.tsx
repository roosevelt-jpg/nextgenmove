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
      // Surface Firebase / session codes so production failures are diagnosable.
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
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 py-4">
      {labels.signInTitle ? (
        <h1 className="font-serif text-2xl text-text-primary">{labels.signInTitle}</h1>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Input
          id="sign-in-email"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
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

        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode as keyof AuthLabels] ??
              errorCode ??
              labels.genericErrorLabel}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {labels.signInSubmitLabel}
        </Button>
      </form>

      {labels.forgotPasswordLinkLabel ? (
        <Link
          href="/forgot-password"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          {labels.forgotPasswordLinkLabel}
        </Link>
      ) : (
        <Link href="/forgot-password" className="text-sm text-text-secondary">
          Forgot password?
        </Link>
      )}

      {labels.signUpLinkLabel ? (
        <Link href="/sign-up" className="text-sm text-text-secondary hover:text-text-primary">
          {labels.signUpLinkLabel}
        </Link>
      ) : (
        <Link href="/sign-up" className="sr-only" aria-hidden="false">
          /sign-up
        </Link>
      )}
    </div>
  );
}
