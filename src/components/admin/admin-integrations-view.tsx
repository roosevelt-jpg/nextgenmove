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
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/integrations");
    if (response.ok) {
      const payload = (await response.json()) as { items: IntegrationItem[] };
      setItems(payload.items);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isStripe = connectItem?.id === "stripe";
  const isSendGrid = connectItem?.id === "sendgrid";

  const connect = async () => {
    if (!connectItem) {
      return;
    }

    setIsSaving(true);

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
      : isSendGrid
        ? {
            config: {
              fromEmail,
              fromName: fromName || labels.sendgridDefaultFromName || "NextGen Move",
            },
            secrets: {
              ...(apiKey ? { apiKey } : {}),
              ...(fromEmail ? { fromEmail } : {}),
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
      setConnectItem(null);
      setApiKey("");
      setConfigHost("");
      setSecretKey("");
      setPublishableKey("");
      setWebhookSecret("");
      setFromEmail("");
      setFromName("");
      await load();
    }
  };

  const disconnect = async (id: string) => {
    await fetch(`/api/admin/integrations/${id}/connect`, { method: "DELETE" });
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

      {items.length === 0 ? (
        <EmptyState title={labels.empty ?? "No integrations configured"} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const connected = item.status === "connected";
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-radius border border-border bg-surface-1 p-4"
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
        onClose={() => setConnectItem(null)}
        title={labels.connectTitle}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConnectItem(null)}>
              {labels.cancel}
            </Button>
            <Button disabled={isSaving} onClick={connect}>
              {labels.connect}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
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
          ) : isSendGrid ? (
            <>
              <Input
                id="sendgrid-api-key"
                type="password"
                label={labels.sendgridApiKey ?? "API key (SG.…)"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <Input
                id="sendgrid-from-email"
                type="email"
                label={labels.sendgridFromEmail ?? "From email"}
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
              />
              <Input
                id="sendgrid-from-name"
                label={labels.sendgridFromName ?? "From name"}
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
              />
              {labels.sendgridHelp ? (
                <p className="text-xs text-text-muted">{labels.sendgridHelp}</p>
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
