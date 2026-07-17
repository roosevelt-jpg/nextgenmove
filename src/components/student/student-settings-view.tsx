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
  const [referralCode, setReferralCode] = useState("");
  const [referralBonus, setReferralBonus] = useState(0);
  const [applyCode, setApplyCode] = useState("");
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [topUpPackages, setTopUpPackages] = useState<
    { id: string; label: string; credits: number; priceEur: number }[]
  >([]);
  const [topUpStatus, setTopUpStatus] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    const [accountRes, referralRes, topUpRes] = await Promise.all([
      fetch("/api/student/account"),
      fetch("/api/student/referral"),
      fetch("/api/student/credits/top-up"),
    ]);

    if (accountRes.ok) {
      const data = (await accountRes.json()) as {
        email: string | null;
        student: { notificationPreferences?: Record<string, boolean> };
      };
      setEmail(data.email ?? "");
      const stored = data.student.notificationPreferences ?? {};
      const nextPrefs: Record<string, boolean> = {};
      for (const key of notificationKeys) {
        nextPrefs[key] = Object.prototype.hasOwnProperty.call(stored, key)
          ? Boolean(stored[key])
          : true;
      }
      setNotificationPreferences(nextPrefs);
    }

    if (referralRes.ok) {
      const data = (await referralRes.json()) as {
        referralCode: string;
        bonusCredits: number;
        referredBy: string | null;
      };
      setReferralCode(data.referralCode);
      setReferralBonus(data.bonusCredits);
      setReferredBy(data.referredBy);
    }

    if (topUpRes.ok) {
      const data = (await topUpRes.json()) as {
        packages: { id: string; label: string; credits: number; priceEur: number }[];
      };
      setTopUpPackages(data.packages ?? []);
    }
  }, [notificationKeys]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const persistNotifications = async (next: Record<string, boolean>) => {
    setIsSaving(true);
    setStatusMessage(null);
    const response = await fetch("/api/student/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationPreferences: next }),
    });
    setIsSaving(false);
    setStatusMessage(
      response.ok
        ? labels.prefsSaved || labels.saveSuccess || "Preferences saved."
        : labels.saveError || "Could not save.",
    );
  };

  const toggleNotification = (key: string, checked: boolean) => {
    const next = { ...notificationPreferences, [key]: checked };
    setNotificationPreferences(next);
    void persistNotifications(next);
  };

  const saveNotifications = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await persistNotifications(notificationPreferences);
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

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
        {labels.referralTitle ? (
          <h2 className="font-serif text-xl text-text-primary">{labels.referralTitle}</h2>
        ) : null}
        {labels.referralIntro ? (
          <p className="text-sm text-text-secondary">
            {labels.referralIntro.replace("{credits}", String(referralBonus))}
          </p>
        ) : null}
        {referralCode ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-radius bg-surface-2 px-3 py-1.5 font-mono text-sm">
              {referralCode}
            </code>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => void navigator.clipboard.writeText(referralCode)}
            >
              {labels.copyCode ?? "Copy"}
            </Button>
          </div>
        ) : null}
        {!referredBy ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setErrorCode(null);
              const response = await fetch("/api/student/referral", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: applyCode }),
              });
              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                  error?: string;
                } | null;
                setErrorCode(payload?.error ?? "apply_failed");
                return;
              }
              setApplyCode("");
              setStatusMessage(labels.referralApplied ?? "");
              await loadAccount();
            }}
          >
            <Input
              id="apply-referral"
              label={labels.applyReferralLabel}
              value={applyCode}
              onChange={(event) => setApplyCode(event.target.value)}
              placeholder={labels.applyReferralPlaceholder}
            />
            <Button type="submit" size="sm">
              {labels.applyReferralAction ?? "Apply"}
            </Button>
          </form>
        ) : labels.alreadyReferred ? (
          <p className="text-sm text-text-muted">{labels.alreadyReferred}</p>
        ) : null}
      </section>

      {topUpPackages.length ? (
        <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
          {labels.topUpTitle ? (
            <h2 className="font-serif text-xl text-text-primary">{labels.topUpTitle}</h2>
          ) : null}
          {labels.topUpIntro ? (
            <p className="text-sm text-text-secondary">{labels.topUpIntro}</p>
          ) : null}
          <ul className="space-y-2">
            {topUpPackages.map((pack) => (
              <li
                key={pack.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-radius border border-border bg-bg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{pack.label}</p>
                  <p className="font-mono text-xs text-text-muted">
                    {pack.credits} cr · €{pack.priceEur}
                  </p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={async () => {
                    setTopUpStatus(null);
                    const response = await fetch("/api/student/credits/top-up", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Idempotency-Key": crypto.randomUUID(),
                      },
                      body: JSON.stringify({ packageId: pack.id }),
                    });
                    if (!response.ok) {
                      setTopUpStatus(labels.topUpFailed ?? "");
                      return;
                    }
                    const payload = (await response.json()) as {
                      mode?: string;
                      url?: string;
                    };
                    if (payload.mode === "stripe" && payload.url) {
                      window.location.href = payload.url;
                      return;
                    }
                    setTopUpStatus(labels.topUpRequested ?? "");
                  }}
                >
                  {labels.topUpAction ?? "Request"}
                </Button>
              </li>
            ))}
          </ul>
          {topUpStatus ? (
            <p className="text-sm text-text-secondary" role="status">
              {topUpStatus}
            </p>
          ) : null}
        </section>
      ) : null}

      <form className="space-y-4" onSubmit={changePassword}>
        {labels.passwordTitle ? (
          <h2 className="font-serif text-xl text-text-primary">{labels.passwordTitle}</h2>
        ) : null}
        <Input
          id="settings-current-password"
          type="password"
          required
          autoComplete="current-password"
          aria-label={labels.currentPassword || "Current password"}
          label={labels.currentPassword || "Current password"}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          id="settings-new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-label={labels.newPassword || "New password"}
          label={labels.newPassword || "New password"}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode] ?? errorCode}
          </p>
        ) : null}
        <Button type="submit">
          {labels.changePassword || "Change password"}
        </Button>
      </form>

      {notificationKeys.length ? (
        <form className="space-y-4" onSubmit={saveNotifications}>
          {labels.notificationsTitle ? (
            <h2 className="font-serif text-xl text-text-primary">{labels.notificationsTitle}</h2>
          ) : null}
          {notificationKeys.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--fill-accent)]"
                checked={Boolean(notificationPreferences[key])}
                onChange={(event) =>
                  toggleNotification(key, event.target.checked)
                }
              />
              {labels[`notification_${key}`] || key}
            </label>
          ))}
          {statusMessage ? (
            <p className="text-sm text-text-secondary" role="status">
              {statusMessage}
            </p>
          ) : null}
          <Button type="submit" disabled={isSaving}>
            {labels.saveNotifications || "Save notifications"}
          </Button>
        </form>
      ) : null}

      <section className="space-y-4 rounded-radius border border-border bg-grad-card p-5">
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
