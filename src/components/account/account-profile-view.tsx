"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";

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
  const router = useRouter();

  const persistPhotoUrl = useCallback(
    async (nextUrl: string | null) => {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: nextUrl }),
      });
      if (response.ok) {
        router.refresh();
      }
      return response.ok;
    },
    [router],
  );

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (!response.ok) {
        setLoadState("error");
        return;
      }
      const data = (await response.json()) as {
        account: AccountPayload;
        warning?: string;
      };
      setAccount(data.account);
      setDisplayName(data.account.displayName);
      setPhone(data.account.phone ?? "");
      setPhotoUrl(data.account.photoUrl);
      setNotificationPreferences(data.account.notificationPreferences ?? {});
      if (data.warning === "account_degraded") {
        setStatusMessage(
          labels.degradedWarning ??
            "Profile details may be incomplete while the database is slow.",
        );
      }
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [labels.degradedWarning]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        phone: phone || null,
        photoUrl,
        notificationPreferences,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    });

    setIsSaving(false);

    if (response.ok) {
      setStatusMessage(labels.saveSuccess ?? "");
      setCurrentPassword("");
      setNewPassword("");
      await load();
      router.refresh();
    } else {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setStatusMessage(
        labels[payload?.error ?? ""] ??
          (payload?.error === "invalid_current_password"
            ? labels.invalid_current_password ??
              "Current password is incorrect."
            : payload?.error === "current_password_required"
              ? labels.current_password_required ??
                "Enter your current password to set a new one."
              : null) ??
          labels.saveError ??
          payload?.error ??
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
          <h1 className="font-serif text-3xl text-text-primary">{labels.accountTitle}</h1>
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
              setPhotoUrl(result.url);
              setStatusMessage(null);
              const ok = await persistPhotoUrl(result.url);
              if (ok) {
                setStatusMessage(
                  labels.photoSaved ?? labels.photoReady ?? "Photo saved.",
                );
                await load();
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
                  setPhotoUrl(null);
                  const ok = await persistPhotoUrl(null);
                  setStatusMessage(
                    ok
                      ? labels.photoRemoved ?? "Photo removed."
                      : labels.saveError ?? "Could not remove photo.",
                  );
                  if (ok) await load();
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
          <h2 className="font-medium text-text-primary">{labels.personalDetailsTitle}</h2>
        ) : null}
        <Input
          id="account-name"
          label={labels.fullName}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Input
          id="account-role"
          label={labels.roleLabel}
          value={roleLabel ?? account.role}
          readOnly
        />
        <Input
          id="account-email"
          label={labels.email}
          value={account.email}
          readOnly
        />
        <Input
          id="account-phone"
          label={labels.phone}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </section>

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
        {labels.passwordTitle ? (
          <h2 className="font-medium text-text-primary">{labels.passwordTitle}</h2>
        ) : null}
        <Input
          id="account-current-password"
          type="password"
          label={labels.currentPassword}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          id="account-new-password"
          type="password"
          label={labels.newPassword}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </section>

      {notificationKeys.length > 0 ? (
        <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
          {labels.notificationsTitle ? (
            <h2 className="font-medium text-text-primary">{labels.notificationsTitle}</h2>
          ) : null}
          {notificationKeys.map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
            >
              <span>{labels[`notification_${key}`] ?? key}</span>
              <input
                type="checkbox"
                checked={Boolean(notificationPreferences[key])}
                onChange={(event) =>
                  setNotificationPreferences((prev) => ({
                    ...prev,
                    [key]: event.target.checked,
                  }))
                }
              />
            </label>
          ))}
        </section>
      ) : null}

      {statusMessage ? (
        <p className="text-sm text-text-secondary">{statusMessage}</p>
      ) : null}

      <Button type="submit" disabled={isSaving}>
        {labels.saveChanges ?? labels.save}
      </Button>
    </form>
  );
}
