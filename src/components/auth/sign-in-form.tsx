"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import {
  establishSession,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/auth-client";
import { resolvePostAuthRedirect } from "@/lib/auth/constants";
import type { AuthLabels } from "@/types/user";

export interface SignInFormProps {
  labels: AuthLabels;
  googleSignInEnabled?: boolean;
}

export function SignInForm({
  labels,
  googleSignInEnabled = false,
}: SignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapError = (code: string, message: string) => {
    if (code === "auth/unauthorized-domain") {
      setErrorCode("unauthorized_domain");
      return;
    }
    if (code === "auth/invalid-email" || code === "auth/missing-email") {
      setEmailError(labels.invalid_email || "Email is invalid");
      return;
    }
    if (
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-login-credentials"
    ) {
      setPasswordError(labels.sign_in_failed || message);
      return;
    }
    if (code === "auth/too-many-requests") {
      setErrorCode("rate_limited");
      return;
    }
    setErrorCode(message || code || "sign_in_failed");
  };

  const finishLogin = async (idToken: string) => {
    const session = await establishSession(idToken);
    const nextPath = searchParams.get("next");
    router.push(resolvePostAuthRedirect(session.role, nextPath));
    router.refresh();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setEmailError(null);
    setPasswordError(null);
    setIsSubmitting(true);

    try {
      if (!email.trim().includes("@")) {
        setEmailError(labels.invalid_email || "Email is invalid");
        return;
      }
      const credential = await signInWithEmail(email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      await finishLogin(idToken);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      const message =
        error instanceof Error ? error.message : "sign_in_failed";
      mapError(code, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      const credential = await signInWithGoogle();
      const idToken = await credential.user.getIdToken(true);
      await finishLogin(idToken);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      if (code === "auth/popup-closed-by-user") {
        return;
      }
      setErrorCode(
        code.startsWith("auth/")
          ? code
          : labels.google_coming_soon || "google_sign_in_failed",
      );
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

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <Input
          id="sign-in-email"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
          placeholder={labels.emailPlaceholder || "you@email.com"}
          aria-label={labels.emailLabel || "Email"}
          label={labels.emailLabel || "Email"}
          value={email}
          error={emailError}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
          }}
        />
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          required
          showPasswordToggle
          aria-label={labels.passwordLabel || "Password"}
          label={labels.passwordLabel || "Password"}
          value={password}
          error={passwordError}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError(null);
          }}
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
              (errorCode === "service_unavailable"
                ? "Sign in is temporarily unavailable. Please try again in a moment."
                : errorCode === "session_timeout"
                  ? "Sign in timed out. Please try again."
                  : errorCode === "session_failed"
                    ? "Could not start your session. Please try again."
                    : errorCode === "rate_limited"
                      ? "Too many attempts. Please wait a minute and try again."
                      : errorCode === "user_not_found"
                        ? "No account found for that email."
                        : errorCode === "account_suspended"
                          ? "This account is suspended."
                          : null) ??
              labels.genericErrorLabel ??
              errorCode}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
          {isSubmitting
            ? (labels.signInSubmittingLabel ?? "Signing in…")
            : (labels.signInSubmitLabel ?? "Sign in")}
        </Button>
      </form>

      {googleSignInEnabled ? (
        <>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-text-muted">
            <span className="h-px flex-1 bg-border" />
            {labels.orDivider || "Or"}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="h-11 w-full"
            onClick={() => void handleGoogle()}
          >
            {labels.continueWithGoogle || "Continue with Google"}
          </Button>
        </>
      ) : null}

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
