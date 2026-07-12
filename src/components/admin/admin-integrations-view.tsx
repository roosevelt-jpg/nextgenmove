"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, Input, Modal } from "@/components/ui";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  iconUrl: string;
  status: "connected" | "not_connected";
  connectedAt: string | null;
  config: Record<string, string>;
}

interface AdminIntegrationsViewProps {
  labels: Record<string, string>;
}

export function AdminIntegrationsView({ labels }: AdminIntegrationsViewProps) {
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [connectItem, setConnectItem] = useState<IntegrationItem | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [configHost, setConfigHost] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromSms, setFromSms] = useState("");
  const [fromWhatsApp, setFromWhatsApp] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const connectErrorMessage = (code?: string) => {
    if (code === "service_unavailable") {
      return (
        labels.service_unavailable ??
        "Could not save — Firestore is over quota. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel (Production), then redeploy — or wait for quota to reset and try Connect again."
      );
    }
    return (
      labels[code ?? ""] ??
      labels.connectError ??
      code ??
      "Could not connect."
    );
  };

  const load = async () => {
    const response = await fetch("/api/admin/integrations", {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      items?: IntegrationItem[];
      warning?: string;
      error?: string;
    } | null;

    const nextItems = payload?.items ?? [];
    setItems(nextItems);

    if (!response.ok && nextItems.length === 0) {
      setActionMessage(labels.loadError ?? "Could not load integrations.");
      return;
    }

    if (payload?.warning === "integrations_degraded") {
      setActionMessage(
        labels.degradedWarning ??
          "Live status may be outdated — Firestore is slow or over quota. Cards still show so you can reconnect.",
      );
      return;
    }

    setActionMessage(null);
  };

  useEffect(() => {
    void load();
  }, []);

  const isStripe = connectItem?.id === "stripe";
  const isResend = connectItem?.id === "resend";
  const isSendGrid = connectItem?.id === "sendgrid";
  const isTwilio = connectItem?.id === "twilio";
  const isYoutube = connectItem?.id === "youtube";

  const connect = async () => {
    if (!connectItem) {
      return;
    }

    setIsSaving(true);
    setActionMessage(null);
    setModalError(null);

    const body = isStripe
      ? {
          config: {
            publishableKey,
            webhookUrl: labels.stripeWebhookPath ?? "/api/webhooks/stripe",
          },
          secrets: {
            ...(secretKey ? { secretKey } : {}),
            ...(webhookSecret ? { webhookSecret } : {}),
            ...(publishableKey ? { publishableKey } : {}),
          },
        }
      : isResend || isSendGrid
        ? {
            config: {
              fromEmail,
              fromName:
                fromName ||
                (isResend
                  ? labels.resendDefaultFromName || "Venturo"
                  : labels.sendgridDefaultFromName || "Venturo"),
            },
            secrets: {
              ...(apiKey ? { apiKey } : {}),
              ...(fromEmail ? { fromEmail } : {}),
            },
          }
        : isTwilio
          ? {
              config: {
                fromSms,
                fromWhatsApp,
                category: "SMS",
              },
              secrets: {
                ...(accountSid ? { accountSid } : {}),
                ...(authToken ? { authToken } : {}),
                ...(fromSms ? { fromSms } : {}),
                ...(fromWhatsApp ? { fromWhatsApp } : {}),
              },
            }
          : isYoutube
            ? {
                config: {
                  category: "Media",
                },
                secrets: {
                  ...(apiKey ? { apiKey } : {}),
                },
              }
            : {
                config: { host: configHost },
                secrets: apiKey ? { apiKey } : undefined,
              };

    const response = await fetch(`/api/admin/integrations/${connectItem.id}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setIsSaving(false);

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        item?: IntegrationItem;
      } | null;
      setConnectItem(null);
      setApiKey("");
      setConfigHost("");
      setSecretKey("");
      setPublishableKey("");
      setWebhookSecret("");
      setFromEmail("");
      setFromName("");
      setAccountSid("");
      setAuthToken("");
      setFromSms("");
      setFromWhatsApp("");
      setActionMessage(labels.connectSuccess ?? "Connected.");
      if (payload?.item) {
        setItems((prev) => {
          const next = prev.filter((row) => row.id !== payload.item!.id);
          return [
            ...next,
            {
              ...payload.item!,
              connectedAt: new Date().toISOString(),
              category: payload.item!.category ?? "",
              status: "connected" as const,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      await load();
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    const message = connectErrorMessage(payload?.error);
    setModalError(message);
    setActionMessage(message);
  };

  const disconnect = async (id: string) => {
    setActionMessage(null);
    const response = await fetch(`/api/admin/integrations/${id}/connect`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setActionMessage(labels.disconnectError ?? "Could not disconnect.");
      return;
    }
    setActionMessage(labels.disconnectSuccess ?? "Disconnected.");
    await load();
  };

  const formatSync = (iso: string | null) => {
    if (!iso) return labels.neverSynced ?? "Never synced";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return labels.syncedJustNow ?? "Synced just now";
    if (mins < 60)
      return (labels.syncedMinutesAgo ?? "Synced {n} min ago").replace(
        "{n}",
        String(mins),
      );
    const hours = Math.round(mins / 60);
    return (labels.syncedHoursAgo ?? "Synced {n}h ago").replace(
      "{n}",
      String(hours),
    );
  };

  const toggle = async (item: IntegrationItem) => {
    if (item.status === "connected") {
      await disconnect(item.id);
      return;
    }
    setModalError(null);
    setConnectItem(item);
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow ?? "Admin · Integrations"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {labels.title ?? "Connect your stack."}
        </h1>
        {labels.subtitle ? (
          <p className="max-w-2xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : labels.stripeHint ? (
          <p className="max-w-2xl text-sm text-text-secondary">{labels.stripeHint}</p>
        ) : null}
      </header>

      {actionMessage ? (
        <p className="text-sm text-text-secondary" role="status">
          {actionMessage}
        </p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title={labels.empty ?? "No integrations configured"} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const connected = item.status === "connected";
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-radius border border-border bg-grad-card p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-radius-sm bg-bg-purple font-mono text-xs font-bold text-fill-accent">
                    {(item.name || item.id).slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={
                      connected
                        ? "rounded-full bg-bg-success px-2.5 py-0.5 text-[10px] font-semibold text-text-success"
                        : "rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary"
                    }
                  >
                    {connected
                      ? (labels.statusConnected ?? "Connected")
                      : (labels.statusNotConnected ?? "Not connected")}
                  </span>
                </div>
                <h2 className="font-semibold text-text-primary">{item.name}</h2>
                {item.category || item.config?.category ? (
                  <p className="text-[12px] text-text-muted">
                    {item.category ?? item.config.category}
                  </p>
                ) : null}
                <p className="mb-4 mt-1 flex-1 text-sm text-text-secondary">
                  {item.description}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-text-muted">
                    {formatSync(item.connectedAt)}
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={connected}
                    onClick={() => void toggle(item)}
                    className={
                      connected
                        ? "relative h-5 w-9 rounded-full bg-text-success"
                        : "relative h-5 w-9 rounded-full bg-border"
                    }
                  >
                    <span
                      className={
                        connected
                          ? "absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
                          : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
                      }
                    />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(connectItem)}
        onClose={() => {
          setConnectItem(null);
          setModalError(null);
        }}
        title={labels.connectTitle || "Connect integration"}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConnectItem(null);
                setModalError(null);
              }}
            >
              {labels.cancel || "Cancel"}
            </Button>
            <Button disabled={isSaving} onClick={() => void connect()}>
              {isSaving
                ? labels.connecting || "Connecting…"
                : labels.connect || "Connect"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError ? (
            <p className="text-sm text-text-warning" role="alert">
              {modalError}
            </p>
          ) : null}
          {isStripe ? (
            <>
              <Input
                id="stripe-secret"
                type="password"
                label={labels.stripeSecretKey ?? "Secret key (sk_…)"}
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
              />
              <Input
                id="stripe-publishable"
                label={labels.stripePublishableKey ?? "Publishable key (pk_…)"}
                value={publishableKey}
                onChange={(event) => setPublishableKey(event.target.value)}
              />
              <Input
                id="stripe-webhook"
                type="password"
                label={labels.stripeWebhookSecret ?? "Webhook signing secret (whsec_…)"}
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
              {labels.stripeWebhookHelp ? (
                <p className="text-xs text-text-muted">{labels.stripeWebhookHelp}</p>
              ) : null}
            </>
          ) : isResend || isSendGrid ? (
            <>
              <Input
                id="email-api-key"
                type="password"
                label={
                  isResend
                    ? (labels.resendApiKey ?? "API key (re_…)")
                    : (labels.sendgridApiKey ?? "API key (SG.…)")
                }
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <Input
                id="email-from-email"
                type="email"
                label={
                  isResend
                    ? (labels.resendFromEmail ?? "From email")
                    : (labels.sendgridFromEmail ?? "From email")
                }
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
              />
              <Input
                id="email-from-name"
                label={
                  isResend
                    ? (labels.resendFromName ?? "From name")
                    : (labels.sendgridFromName ?? "From name")
                }
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
              />
              {isResend && labels.resendHelp ? (
                <p className="text-xs text-text-muted">{labels.resendHelp}</p>
              ) : null}
              {!isResend && labels.sendgridHelp ? (
                <p className="text-xs text-text-muted">{labels.sendgridHelp}</p>
              ) : null}
            </>
          ) : isTwilio ? (
            <>
              <Input
                id="twilio-account-sid"
                label={labels.twilioAccountSid ?? "Account SID"}
                value={accountSid}
                onChange={(event) => setAccountSid(event.target.value)}
              />
              <Input
                id="twilio-auth-token"
                type="password"
                label={labels.twilioAuthToken ?? "Auth token"}
                value={authToken}
                onChange={(event) => setAuthToken(event.target.value)}
              />
              <Input
                id="twilio-from-sms"
                label={labels.twilioFromSms ?? "SMS from number"}
                value={fromSms}
                onChange={(event) => setFromSms(event.target.value)}
              />
              <Input
                id="twilio-from-whatsapp"
                label={labels.twilioFromWhatsApp ?? "WhatsApp from number"}
                value={fromWhatsApp}
                onChange={(event) => setFromWhatsApp(event.target.value)}
              />
              {labels.twilioHelp ? (
                <p className="text-xs text-text-muted">{labels.twilioHelp}</p>
              ) : null}
            </>
          ) : isYoutube ? (
            <>
              {labels.youtubeHint ? (
                <p className="text-sm text-text-secondary">{labels.youtubeHint}</p>
              ) : null}
              <Input
                id="youtube-api-key"
                type="password"
                label={labels.youtubeApiKey ?? "YouTube Data API key"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              {labels.youtubeHelp ? (
                <p className="text-xs text-text-muted">{labels.youtubeHelp}</p>
              ) : null}
            </>
          ) : (
            <>
              <Input
                id="integration-host"
                label={labels.host}
                value={configHost}
                onChange={(event) => setConfigHost(event.target.value)}
              />
              <Input
                id="integration-api-key"
                type="password"
                label={labels.apiKey}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
