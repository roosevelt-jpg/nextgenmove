"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    const response = await fetch("/api/account");
    if (!response.ok) return;
    const data = (await response.json()) as { account: AccountPayload };
    setAccount(data.account);
    setDisplayName(data.account.displayName);
    setPhone(data.account.phone ?? "");
    setPhotoUrl(data.account.photoUrl);
    setNotificationPreferences(data.account.notificationPreferences ?? {});
  }, []);

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
    } else {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setStatusMessage(
        labels[payload?.error ?? ""] ?? labels.saveError ?? payload?.error ?? "",
      );
    }
  };

  if (!account) return null;

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
        <div className="space-y-2">
          <FileUpload
            storagePath={storagePath}
            accept="image/*"
            label={labels.uploadPhoto}
            dropzoneContent={labels.photoDropzone}
            progressLabel={labels.uploadProgress}
            onUploadComplete={(result: FileUploadMetadata) =>
              setPhotoUrl(result.url)
            }
          />
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPhotoUrl(null)}
            >
              {labels.removePhoto}
            </Button>
          ) : null}
        </div>
      </div>

      <section className="space-y-3 rounded-radius border border-border bg-surface-1 p-4">
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

      <section className="space-y-3 rounded-radius border border-border bg-surface-1 p-4">
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
        <section className="space-y-3 rounded-radius border border-border bg-surface-1 p-4">
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
