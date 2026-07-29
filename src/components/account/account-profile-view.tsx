"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import { FormPersistBar } from "@/components/ui/form-persist-bar";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";

export interface AccountProfileViewProps {
  labels: Record<string, string>;
  notificationKeys: string[];
  storagePath: string;
  roleLabel?: string;
}

interface AccountPayload {
  displayName: string;
  email: string;
  photoUrl: string | null;
  phone: string | null;
  role: string;
  notificationPreferences: Record<string, boolean>;
}

function prefsEqual(
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (Boolean(a[key]) !== Boolean(b[key])) return false;
  }
  return true;
}

export function AccountProfileView({
  labels,
  notificationKeys,
  storagePath,
  roleLabel,
}: AccountProfileViewProps) {
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notificationPreferences, setNotificationPreferences] = useState<
    Record<string, boolean>
  >({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const suppressNextRef = useRef<() => void>(() => undefined);

  const profileDraft = useMemo(() => {
    if (!hydrated) return null;
    return { displayName, phone, photoUrl, notificationPreferences };
  }, [hydrated, displayName, phone, photoUrl, notificationPreferences]);

  const completePreferences = useCallback(
    (partial: Record<string, boolean>) => {
      const next: Record<string, boolean> = {};
      for (const key of notificationKeys) {
        next[key] = Object.prototype.hasOwnProperty.call(partial, key)
          ? Boolean(partial[key])
          : true;
      }
      return next;
    },
    [notificationKeys],
  );

  const persistProfileDraft = useCallback(
    async (next: {
      displayName: string;
      phone: string;
      photoUrl: string | null;
      notificationPreferences: Record<string, boolean>;
    }) => {
      if (!next.displayName.trim()) return "skipped" as const;
      const prefs = completePreferences(next.notificationPreferences);
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: next.displayName,
          phone: next.phone || null,
          photoUrl: next.photoUrl || null,
          notificationPreferences: prefs,
        }),
      });
      if (!response.ok) {
        setStatusMessage(labels.saveError || "Could not save.");
        return false;
      }
      // Prevent echo: applying prefs must not schedule another autosave.
      suppressNextRef.current();
      setNotificationPreferences((prev) =>
        prefsEqual(prev, prefs) ? prev : prefs,
      );
      setStatusMessage(labels.saveSuccess || "Saved.");
      return true;
    },
    [completePreferences, labels.saveError, labels.saveSuccess],
  );

  const { status: autosaveStatus, suppressNext } = useDebouncedAutosave(
    profileDraft,
    persistProfileDraft,
    { enabled: hydrated, delayMs: 800 },
  );

  useEffect(() => {
    suppressNextRef.current = suppressNext;
  }, [suppressNext]);

  const persistPhotoUrl = useCallback(async (nextUrl: string | null) => {
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: nextUrl }),
    });
    return response.ok;
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) setLoadState("loading");
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        if (!response.ok) {
          if (!silent) setLoadState("error");
          return;
        }
        const data = (await response.json()) as {
          account: AccountPayload;
          warning?: string;
        };
        suppressNext();
        setAccount(data.account);
        setDisplayName(data.account.displayName);
        setPhone(data.account.phone ?? "");
        setPhotoUrl(data.account.photoUrl);
        const stored = data.account.notificationPreferences ?? {};
        const nextPrefs: Record<string, boolean> = {};
        for (const key of notificationKeys) {
          nextPrefs[key] = Object.prototype.hasOwnProperty.call(stored, key)
            ? Boolean(stored[key])
            : true;
        }
        setNotificationPreferences((prev) =>
          prefsEqual(prev, nextPrefs) ? prev : nextPrefs,
        );
        if (data.warning === "account_degraded") {
          setStatusMessage(
            labels.degradedWarning ||
              "Profile details may be incomplete while the database is slow.",
          );
        }
        setHydrated(true);
        setLoadState("ready");
      } catch {
        if (!silent) setLoadState("error");
      }
    },
    [labels.degradedWarning, notificationKeys, suppressNext],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const persistNotificationPreferences = async (
    next: Record<string, boolean>,
  ) => {
    const payload = completePreferences(next);
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationPreferences: payload }),
    });
    if (response.ok) {
      suppressNext();
      setNotificationPreferences((prev) =>
        prefsEqual(prev, payload) ? prev : payload,
      );
      setStatusMessage(
        labels.prefsSaved || labels.saveSuccess || "Preferences saved.",
      );
      return true;
    }
    setStatusMessage(labels.saveError || "Could not save.");
    return false;
  };

  const toggleNotification = async (key: string, checked: boolean) => {
    const previous = notificationPreferences;
    const next = completePreferences({
      ...notificationPreferences,
      [key]: checked,
    });
    suppressNext();
    setNotificationPreferences(next);
    setStatusMessage(null);
    const ok = await persistNotificationPreferences(next);
    if (!ok) {
      suppressNext();
      setNotificationPreferences(previous);
    }
  };

  const toggleAllNotifications = async (checked: boolean) => {
    const previous = notificationPreferences;
    const next: Record<string, boolean> = {};
    for (const key of notificationKeys) {
      next[key] = checked;
    }
    suppressNext();
    setNotificationPreferences(next);
    setStatusMessage(null);
    const ok = await persistNotificationPreferences(next);
    if (!ok) {
      suppressNext();
      setNotificationPreferences(previous);
    }
  };

  const allNotificationsEnabled =
    notificationKeys.length > 0 &&
    notificationKeys.every((key) => Boolean(notificationPreferences[key]));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const prefsPayload = completePreferences(notificationPreferences);
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        phone: phone || null,
        photoUrl,
        notificationPreferences: prefsPayload,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    });

    setIsSaving(false);

    if (response.ok) {
      suppressNext();
      setNotificationPreferences((prev) =>
        prefsEqual(prev, prefsPayload) ? prev : prefsPayload,
      );
      setStatusMessage(labels.saveSuccess || "Saved.");
      setCurrentPassword("");
      setNewPassword("");
      await load({ silent: true });
      router.refresh();
    } else {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setStatusMessage(
        labels[payload?.error ?? ""] ||
          (payload?.error === "invalid_current_password"
            ? labels.invalid_current_password ||
              "Current password is incorrect."
            : payload?.error === "current_password_required"
              ? labels.current_password_required ||
                "Enter your current password to set a new one."
              : null) ||
          labels.saveError ||
          payload?.error ||
          "",
      );
    }
  };

  if (loadState === "loading") {
    return (
      <p className="text-sm text-text-secondary">
        {labels.loading ?? "Loading…"}
      </p>
    );
  }

  if (loadState === "error" || !account) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-warning" role="alert">
          {labels.loadError ?? "Could not load your account. Try again."}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          {labels.retry ?? "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <form className="max-w-xl space-y-6" onSubmit={save}>
      <header className="space-y-2">
        {labels.accountEyebrow ? (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-accent">
            {labels.accountEyebrow}
          </p>
        ) : null}
        {labels.accountTitle ? (
          <h1 className="font-serif text-3xl text-text-primary">
            {labels.accountTitle}
          </h1>
        ) : null}
        {labels.accountSubtitle ? (
          <p className="text-sm text-text-secondary">{labels.accountSubtitle}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-lavender text-xl font-semibold text-text-accent">
            {(displayName || account.email || "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-[12rem] flex-1 space-y-2">
          <FileUpload
            storagePath={storagePath}
            uploadEndpoint="/api/account/upload"
            accept="image/*"
            label={labels.uploadPhoto || "Upload photo"}
            dropzoneContent={
              labels.photoDropzone || "JPG or PNG. Click or drop to upload."
            }
            progressLabel={labels.uploadProgress || "Uploading…"}
            onUploadComplete={async (result: FileUploadMetadata) => {
              // Photo is persisted immediately — don't let autosave re-fire a loop.
              suppressNext();
              setPhotoUrl(result.url);
              setStatusMessage(null);
              const ok = await persistPhotoUrl(result.url);
              if (ok) {
                setStatusMessage(
                  labels.photoSaved ?? labels.photoReady ?? "Photo saved.",
                );
                router.refresh();
              } else {
                setStatusMessage(
                  labels.photoReady ??
                    "Photo uploaded — click Save changes to keep it.",
                );
              }
            }}
            onError={(error) => {
              setStatusMessage(
                labels[error.message] ??
                  labels.uploadError ??
                  (error.message === "storage_not_configured"
                    ? "Storage is not configured."
                    : error.message === "upload_failed"
                      ? "Upload failed. Try a smaller JPG or PNG."
                      : error.message) ??
                  "Upload failed.",
              );
            }}
          />
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void (async () => {
                  suppressNext();
                  setPhotoUrl(null);
                  const ok = await persistPhotoUrl(null);
                  setStatusMessage(
                    ok
                      ? (labels.photoRemoved ?? "Photo removed.")
                      : (labels.saveError ?? "Could not remove photo."),
                  );
                  if (ok) router.refresh();
                })();
              }}
            >
              {labels.removePhoto || "Remove"}
            </Button>
          ) : null}
        </div>
      </div>

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
        {labels.personalDetailsTitle ? (
          <h2 className="font-medium text-text-primary">
            {labels.personalDetailsTitle}
          </h2>
        ) : null}
        <Input
          id="account-name"
          label={labels.fullName || "Full name"}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Input
          id="account-role"
          label={labels.roleLabel || "Role"}
          value={roleLabel ?? account.role}
          readOnly
        />
        <Input
          id="account-email"
          label={labels.email || "Email"}
          value={account.email}
          readOnly
        />
        <Input
          id="account-phone"
          label={labels.phone || "Phone"}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </section>

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
        {labels.passwordTitle ? (
          <h2 className="font-medium text-text-primary">{labels.passwordTitle}</h2>
        ) : (
          <h2 className="font-medium text-text-primary">Password</h2>
        )}
        <Input
          id="account-current-password"
          type="password"
          label={labels.currentPassword || "Current password"}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
        />
        <Input
          id="account-new-password"
          type="password"
          label={labels.newPassword || "New password"}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
        />
      </section>

      {notificationKeys.length > 0 ? (
        <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
          {labels.notificationsTitle ? (
            <h2 className="font-medium text-text-primary">
              {labels.notificationsTitle}
            </h2>
          ) : null}
          <label className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm font-medium">
            <span>
              {labels.notificationsMaster ||
                labels.enableNotifications ||
                "Enable notifications"}
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--fill-accent)]"
              checked={allNotificationsEnabled}
              onChange={(event) =>
                void toggleAllNotifications(event.target.checked)
              }
            />
          </label>
          {notificationKeys.map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
            >
              <span>
                {labels[`notification_${key}`] ||
                  ({
                    pending_requests: "New pending requests",
                    weekly_digest: "Weekly digest",
                    sms_alerts: "SMS alerts",
                    match_updates: "Match & pipeline updates",
                    credit_receipts: "Credit receipts",
                    low_balance: "Low credit balance alerts",
                    referral: "Referral bonuses",
                    login_alerts: "Login alerts",
                    product_updates: "Product updates",
                  }[key] ??
                    key)}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--fill-accent)]"
                checked={Boolean(notificationPreferences[key])}
                onChange={(event) =>
                  void toggleNotification(key, event.target.checked)
                }
              />
            </label>
          ))}
        </section>
      ) : null}

      <FormPersistBar
        status={autosaveStatus}
        isSaving={isSaving}
        message={statusMessage}
        saveType="submit"
        labels={{
          save: labels.saveChanges || labels.save,
          saving: labels.saving,
          saved: labels.saveSuccess || labels.saved,
          saveError: labels.saveError,
          autosaveHint: labels.autosaveHint,
        }}
      />
    </form>
  );
}
