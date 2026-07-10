"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { Button, Input } from "@/components/ui";
import { auth } from "@/lib/firebase-client";
import { clearSession } from "@/lib/auth-client";

export interface StudentSettingsViewProps {
  labels: Record<string, string>;
  notificationKeys: string[];
}

export function StudentSettingsView({
  labels,
  notificationKeys,
}: StudentSettingsViewProps) {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notificationPreferences, setNotificationPreferences] = useState<
    Record<string, boolean>
  >({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadAccount = useCallback(async () => {
    const response = await fetch("/api/student/account");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      email: string | null;
      student: { notificationPreferences?: Record<string, boolean> };
    };

    setEmail(data.email ?? "");
    setNotificationPreferences(data.student.notificationPreferences ?? {});
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const saveNotifications = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch("/api/student/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationPreferences }),
    });

    setIsSaving(false);
    setStatusMessage(response.ok ? labels.saveSuccess ?? "" : labels.saveError ?? "");
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);

    const user = auth.currentUser;
    if (!user || !email) {
      setErrorCode("auth_required");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setStatusMessage(labels.passwordChanged ?? "");
    } catch {
      setErrorCode("password_change_failed");
    }
  };

  const deactivateAccount = async () => {
    setIsDeactivating(true);
    setErrorCode(null);

    const response = await fetch("/api/student/deactivate", { method: "POST" });

    if (response.ok) {
      await clearSession();
      window.location.href = "/sign-in";
      return;
    }

    setIsDeactivating(false);
    setErrorCode("deactivate_failed");
  };

  return (
    <div className="max-w-xl space-y-10">
      <section className="space-y-4">
        {labels.accountTitle ? (
          <h2 className="font-serif text-xl text-text-primary">{labels.accountTitle}</h2>
        ) : null}
        {email && labels.emailLabel ? (
          <p className="text-sm text-text-secondary">
            {labels.emailLabel}: {email}
          </p>
        ) : null}
      </section>

      <form className="space-y-4" onSubmit={changePassword}>
        {labels.passwordTitle ? (
          <h2 className="font-serif text-xl text-text-primary">{labels.passwordTitle}</h2>
        ) : null}
        <Input
          id="settings-current-password"
          type="password"
          required
          autoComplete="current-password"
          aria-label={labels.currentPassword ?? "current-password"}
          label={labels.currentPassword}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          id="settings-new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-label={labels.newPassword ?? "new-password"}
          label={labels.newPassword}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode] ?? errorCode}
          </p>
        ) : null}
        <Button type="submit">{labels.changePassword}</Button>
      </form>

      <form className="space-y-4" onSubmit={saveNotifications}>
        {labels.notificationsTitle ? (
          <h2 className="font-serif text-xl text-text-primary">{labels.notificationsTitle}</h2>
        ) : null}
        {notificationKeys.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={Boolean(notificationPreferences[key])}
              onChange={(event) =>
                setNotificationPreferences((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }))
              }
            />
            {labels[`notification_${key}`] ?? key}
          </label>
        ))}
        {statusMessage ? (
          <p className="text-sm text-text-secondary" role="status">
            {statusMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {labels.saveNotifications}
        </Button>
      </form>

      <section className="space-y-4 rounded-radius border border-border bg-surface-2 p-5">
        {labels.dangerZoneTitle ? (
          <h2 className="font-serif text-xl text-text-primary">{labels.dangerZoneTitle}</h2>
        ) : null}
        {labels.deactivateDescription ? (
          <p className="text-sm text-text-secondary">{labels.deactivateDescription}</p>
        ) : null}
        {labels.deactivateAccount ? (
          <Button variant="outline" disabled={isDeactivating} onClick={deactivateAccount}>
            {labels.deactivateAccount}
          </Button>
        ) : null}
      </section>
    </div>
  );
}
