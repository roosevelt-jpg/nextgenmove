"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { Button, Input } from "@/components/ui";
import {
  establishSession,
  login2faRequest,
  SessionEstablishError,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/auth-client";
import { auth } from "@/lib/firebase-client";
import { resolvePostAuthRedirect } from "@/lib/auth/constants";
import {
  clearRecaptcha,
  confirmLoginPhoneCode,
  startLoginPhoneVerification,
} from "@/lib/auth/phone-otp-client";
import type { AuthLabels } from "@/types/user";

export interface SignInFormProps {
  labels: AuthLabels;
  googleSignInEnabled?: boolean;
}

type TwoFaMethod = "email" | "phone";

interface TwoFaState {
  methods: { email: boolean; phone: boolean };
  phone: string | null;
  phoneHint: string | null;
  expectedUid: string;
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

  const [twoFa, setTwoFa] = useState<TwoFaState | null>(null);
  const [twoFaMethod, setTwoFaMethod] = useState<TwoFaMethod>("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [twoFaBusy, setTwoFaBusy] = useState(false);

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

  const redirectAfterSession = (role: string) => {
    const nextPath = searchParams.get("next");
    router.push(
      resolvePostAuthRedirect(
        role as "admin" | "student" | "company",
        nextPath,
      ),
    );
    router.refresh();
  };

  const finishLogin = async (idToken: string) => {
    try {
      const session = await establishSession(idToken);
      redirectAfterSession(session.role);
    } catch (error) {
      if (error instanceof SessionEstablishError) {
        const methods = (error.payload.methods ?? {
          email: true,
          phone: false,
        }) as { email: boolean; phone: boolean };
        const phone =
          typeof error.payload.phone === "string" ? error.payload.phone : null;
        const phoneHint =
          typeof error.payload.phoneHint === "string"
            ? error.payload.phoneHint
            : null;
        const expectedUid = auth.currentUser?.uid ?? "";
        setTwoFa({
          methods,
          phone,
          phoneHint,
          expectedUid,
        });
        setTwoFaMethod(methods.email ? "email" : "phone");
        setOtpCode("");
        setOtpSent(false);
        setPhoneConfirmation(null);
        setErrorCode(null);
        return;
      }
      throw error;
    }
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

  const currentIdToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("not_signed_in");
    return user.getIdToken(true);
  };

  const sendEmailOtp = async () => {
    setTwoFaBusy(true);
    setErrorCode(null);
    try {
      const idToken = await currentIdToken();
      await login2faRequest({ action: "send_email_otp", idToken });
      setOtpSent(true);
    } catch (error) {
      setErrorCode(
        error instanceof Error ? error.message : "email_otp_send_failed",
      );
    } finally {
      setTwoFaBusy(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!twoFa?.phone) {
      setErrorCode("phone_not_available");
      return;
    }
    setTwoFaBusy(true);
    setErrorCode(null);
    try {
      const confirmation = await startLoginPhoneVerification(twoFa.phone);
      setPhoneConfirmation(confirmation);
      setOtpSent(true);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      setErrorCode(
        code ||
          (error instanceof Error ? error.message : "sms_otp_send_failed"),
      );
    } finally {
      setTwoFaBusy(false);
    }
  };

  const verifyTwoFa = async () => {
    if (!twoFa) return;
    setTwoFaBusy(true);
    setErrorCode(null);
    try {
      if (twoFaMethod === "email") {
        const idToken = await currentIdToken();
        await login2faRequest({
          action: "verify_email_otp",
          idToken,
          code: otpCode.trim(),
        });
      } else {
        if (!phoneConfirmation || !twoFa.phone) {
          throw new Error("sms_otp_send_failed");
        }
        await confirmLoginPhoneCode(
          phoneConfirmation,
          otpCode.trim(),
          twoFa.expectedUid,
        );
        const idToken = await currentIdToken();
        await login2faRequest({
          action: "confirm_phone",
          idToken,
          phoneE164: twoFa.phone,
        });
      }

      const idToken = await currentIdToken();
      const session = await login2faRequest({
        action: "complete_session",
        idToken,
      });
      if ("role" in session) {
        clearRecaptcha();
        redirectAfterSession(session.role);
        return;
      }
      // Fallback: try normal session establish
      await finishLogin(idToken);
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "otp_invalid");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const cancelTwoFa = () => {
    clearRecaptcha();
    setTwoFa(null);
    setOtpCode("");
    setOtpSent(false);
    setPhoneConfirmation(null);
    setErrorCode(null);
  };

  const resolveError = (code: string | null) => {
    if (!code) return null;
    return (
      labels[code as keyof AuthLabels] ??
      (code === "service_unavailable"
        ? "Sign in is temporarily unavailable. Please try again in a moment."
        : code === "session_timeout"
          ? "Sign in timed out. Please try again."
          : code === "session_failed"
            ? "Could not start your session. Please try again."
            : code === "rate_limited"
              ? "Too many attempts. Please wait a minute and try again."
              : code === "two_factor_required"
                ? "Enter the verification code to finish signing in."
                : code === "phone_not_available"
                  ? "No phone number on this admin account. Use email code."
                  : code === "phone_uid_mismatch"
                    ? "That phone number is not linked to this account."
                    : null) ??
      labels.genericErrorLabel ??
      code
    );
  };

  if (twoFa) {
    const canEmail = twoFa.methods.email;
    const canPhone = twoFa.methods.phone && Boolean(twoFa.phone);

    return (
      <div className="flex w-full max-w-[22.5rem] flex-col gap-4">
        <header className="space-y-1.5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
            {labels.twoFaEyebrow ?? "Two-factor authentication"}
          </p>
          <h1 className="font-serif text-[clamp(1.5rem,3vw,1.85rem)] font-semibold leading-tight text-text-primary">
            {labels.twoFaTitle ?? "Verify it’s you."}
          </h1>
          <p className="text-sm text-text-secondary">
            {labels.twoFaSubtitle ??
              "Admins need an email or SMS code before entering the workspace."}
          </p>
        </header>

        {canEmail && canPhone ? (
          <div className="flex gap-1 rounded-radius border border-border p-1">
            <button
              type="button"
              className={
                twoFaMethod === "email"
                  ? "flex-1 rounded-radius-sm bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary"
                  : "flex-1 rounded-radius-sm px-3 py-2 text-sm text-text-secondary"
              }
              onClick={() => {
                setTwoFaMethod("email");
                setOtpCode("");
                setOtpSent(false);
                setPhoneConfirmation(null);
                setErrorCode(null);
              }}
            >
              {labels.twoFaEmailTab ?? "Email code"}
            </button>
            <button
              type="button"
              className={
                twoFaMethod === "phone"
                  ? "flex-1 rounded-radius-sm bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary"
                  : "flex-1 rounded-radius-sm px-3 py-2 text-sm text-text-secondary"
              }
              onClick={() => {
                setTwoFaMethod("phone");
                setOtpCode("");
                setOtpSent(false);
                setPhoneConfirmation(null);
                setErrorCode(null);
              }}
            >
              {labels.twoFaSmsTab ?? "SMS code"}
            </button>
          </div>
        ) : null}

        <p className="text-xs text-text-muted">
          {twoFaMethod === "email"
            ? (labels.twoFaEmailHint ??
              "We’ll send a 6-digit code to your admin email.")
            : (labels.twoFaSmsHint ?? "We’ll send a Firebase SMS code to") +
              (twoFa.phoneHint ? ` ${twoFa.phoneHint}` : "")}
        </p>

        <Input
          id="sign-in-2fa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          label={
            twoFaMethod === "email"
              ? (labels.emailOtpLabel ?? "Email code")
              : (labels.smsOtpLabel ?? "SMS code")
          }
          value={otpCode}
          onChange={(event) => setOtpCode(event.target.value)}
        />

        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {resolveError(errorCode)}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={twoFaBusy}
            className="h-11 w-full"
            onClick={() =>
              void (twoFaMethod === "email" ? sendEmailOtp() : sendPhoneOtp())
            }
          >
            {otpSent
              ? (labels.twoFaResend ?? "Resend code")
              : (labels.twoFaSend ?? "Send code")}
          </Button>
          <Button
            type="button"
            disabled={twoFaBusy || otpCode.trim().length < 4}
            className="h-11 w-full"
            onClick={() => void verifyTwoFa()}
          >
            {twoFaBusy
              ? (labels.signInSubmittingLabel ?? "Signing in…")
              : (labels.twoFaVerify ?? "Verify & continue")}
          </Button>
          <button
            type="button"
            className="text-center text-[13px] text-text-secondary underline-offset-2 hover:underline"
            onClick={cancelTwoFa}
          >
            {labels.backLabel ?? "Back"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[22.5rem] flex-col gap-4">
      <header className="space-y-1.5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.signInEyebrow ?? "Welcome back"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,1.85rem)] font-semibold leading-tight text-text-primary">
          {labels.signInTitle ?? "Sign in to your account."}
        </h1>
        {labels.signInSubtitle ? (
          <p className="text-sm text-text-secondary">{labels.signInSubtitle}</p>
        ) : null}
      </header>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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
          <Link href="/forgot-password" className="link-brand text-[13px]">
            {labels.forgotPasswordLinkLabel ?? "Forgot password?"}
          </Link>
        </div>

        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {resolveError(errorCode)}
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
        <Link href="/sign-up" className="link-brand">
          {labels.signUpLinkShort ?? "Sign up"}
        </Link>
      </p>
    </div>
  );
}
