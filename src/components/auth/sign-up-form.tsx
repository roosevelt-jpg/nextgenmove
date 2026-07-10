"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import {
  establishSession,
  registerAccount,
  signInWithEmail,
} from "@/lib/auth-client";
import type { AuthLabels, SignUpRole } from "@/types/user";

export interface SignUpFormProps {
  labels: AuthLabels;
}

export function SignUpForm({ labels }: SignUpFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<SignUpRole>("student");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(
    () =>
      [
        labels.roleCompanyLabel
          ? { value: "company" as const, label: labels.roleCompanyLabel }
          : null,
        labels.roleStudentLabel
          ? { value: "student" as const, label: labels.roleStudentLabel }
          : null,
      ].filter((option): option is { value: SignUpRole; label: string } => option !== null),
    [labels.roleCompanyLabel, labels.roleStudentLabel],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      await registerAccount({
        email,
        password,
        role,
        displayName: displayName.trim() || undefined,
      });

      const credential = await signInWithEmail(email, password);
      const idToken = await credential.user.getIdToken();
      const session = await establishSession(idToken);

      router.push(session.redirectTo);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "register_failed";
      setErrorCode(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 py-4">
      {labels.signUpTitle ? (
        <h1 className="font-serif text-2xl text-text-primary">{labels.signUpTitle}</h1>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Input
          id="sign-up-display-name"
          type="text"
          autoComplete="name"
          aria-label={labels.displayNameLabel ?? "display-name"}
          label={labels.displayNameLabel}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          required
          aria-label={labels.emailLabel ?? "email"}
          label={labels.emailLabel}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-label={labels.passwordLabel ?? "password"}
          label={labels.passwordLabel}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Select
          id="sign-up-role"
          required={roleOptions.length > 0}
          disabled={roleOptions.length === 0}
          aria-label={labels.roleLabel ?? "role"}
          label={labels.roleLabel}
          value={role}
          options={roleOptions}
          onChange={(event) => setRole(event.target.value as SignUpRole)}
        />

        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode as keyof AuthLabels] ?? labels.genericErrorLabel}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {labels.signUpSubmitLabel}
        </Button>
      </form>

      {labels.signInLinkLabel ? (
        <Link href="/sign-in" className="text-sm text-text-secondary hover:text-text-primary">
          {labels.signInLinkLabel}
        </Link>
      ) : (
        <Link href="/sign-in" className="sr-only" aria-hidden="false">
          /sign-in
        </Link>
      )}
    </div>
  );
}
