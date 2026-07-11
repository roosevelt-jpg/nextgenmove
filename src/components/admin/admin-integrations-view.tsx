"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, Input, Modal } from "@/components/ui";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  status: "connected" | "not_connected";
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
        {labels.stripeHint ? (
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">{labels.stripeHint}</p>
        ) : null}
        {labels.sendgridHint ? (
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">{labels.sendgridHint}</p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState title={labels.empty} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-radius border border-border bg-surface-1 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-medium text-text-primary">{item.name}</h2>
                <span className="text-xs uppercase text-text-muted">{item.status}</span>
              </div>
              <p className="mb-4 text-sm text-text-secondary">{item.description}</p>
              {item.status === "connected" ? (
                <Button variant="outline" onClick={() => disconnect(item.id)}>
                  {labels.disconnect}
                </Button>
              ) : (
                <Button onClick={() => setConnectItem(item)}>{labels.connect}</Button>
              )}
            </article>
          ))}
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
