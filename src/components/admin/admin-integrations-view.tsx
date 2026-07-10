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

  const connect = async () => {
    if (!connectItem) {
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/admin/integrations/${connectItem.id}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: { host: configHost },
        secrets: apiKey ? { apiKey } : undefined,
      }),
    });

    setIsSaving(false);

    if (response.ok) {
      setConnectItem(null);
      setApiKey("");
      setConfigHost("");
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
        </div>
      </Modal>
    </div>
  );
}
