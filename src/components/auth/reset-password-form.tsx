"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { confirmPasswordReset } from "firebase/auth";
import { Button, Input } from "@/components/ui";
import { auth } from "@/lib/firebase-client";
import type { AuthLabels } from "@/types/user";

export interface ResetPasswordFormProps {
  labels: AuthLabels;
}

export function ResetPasswordForm({ labels }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = useMemo(
    () => searchParams.get("oobCode")?.trim() || "",
    [searchParams],
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    setStatus("idle");

    if (!oobCode) {
      setErrorCode("reset_link_invalid");
      setStatus("error");
      return;
    }
    if (password.length < 8) {
      setErrorCode("password_too_short");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setErrorCode("password_mismatch");
      setStatus("error");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("success");
      window.setTimeout(() => {
        router.replace("/sign-in");
        router.refresh();
      }, 1200);
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? String((error as { code: string }).code)
          : "reset_failed";
      if (
        code === "auth/expired-action-code" ||
        code === "auth/invalid-action-code"
      ) {
        setErrorCode("reset_link_invalid");
      } else if (code === "auth/weak-password") {
        setErrorCode("password_too_short");
      } else {
        setErrorCode("reset_failed");
      }
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!oobCode) {
    return (
      <div className="flex w-full max-w-[22.5rem] flex-col gap-4">
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.resetPasswordTitle ?? "Choose a new password"}
        </h1>
        <p className="text-sm text-text-warning" role="alert">
          {labels.reset_link_invalid ??
            "This reset link is missing or invalid. Request a new one."}
        </p>
        <Link href="/forgot-password" className="link-brand text-sm">
          {labels.forgotPasswordLinkLabel ?? "Forgot password?"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[22.5rem] flex-col gap-4">
      <h1 className="font-serif text-2xl text-text-primary">
        {labels.resetPasswordTitle ?? "Choose a new password"}
      </h1>
      <p className="text-sm text-text-secondary">
        {labels.resetPasswordIntro ??
          "Works for student, employer, and admin accounts. Enter a new password of at least 8 characters."}
      </p>

      <form className="flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id="reset-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          showPasswordToggle
          label={labels.newPasswordLabel ?? labels.passwordLabel ?? "New password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          id="reset-password-confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          showPasswordToggle
          label={labels.confirmPasswordLabel ?? "Confirm password"}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        {status === "success" ? (
          <p className="text-sm text-text-success" role="status">
            {labels.resetPasswordSuccess ??
              "Password updated. Redirecting to sign in…"}
          </p>
        ) : null}
        {status === "error" && errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode] ??
              labels.genericErrorLabel ??
              "Could not reset password."}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting || status === "success"}>
          {isSubmitting
            ? (labels.resetPasswordSubmitting ?? "Updating…")
            : (labels.resetPasswordSubmit ?? "Update password")}
        </Button>
      </form>

      <Link
        href="/sign-in"
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        {labels.signInLinkLabel ?? "Sign in"}
      </Link>
    </div>
  );
}
