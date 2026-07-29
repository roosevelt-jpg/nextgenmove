"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, Input, Modal } from "@/components/ui";
import { resolveIntegrationLogoUrl } from "@/lib/integrations/logos";

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

function IntegrationIcon({
  id,
  name,
  iconUrl,
}: {
  id: string;
  name: string;
  iconUrl?: string;
}) {
  const src = resolveIntegrationLogoUrl(id, iconUrl);
  if (src) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-radius-sm border border-border bg-surface-1 p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-radius-sm bg-bg-purple font-mono text-xs font-bold text-fill-accent">
      {(name || id).slice(0, 2).toUpperCase()}
    </div>
  );
}

export function AdminIntegrationsView({ labels }: AdminIntegrationsViewProps) {
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [connectItem, setConnectItem] = useState<IntegrationItem | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [youtubeChannelUrl, setYoutubeChannelUrl] = useState("");
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
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthRefreshToken, setOauthRefreshToken] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
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
    if (code === "missing_secrets") {
      return (
        labels.missing_secrets ??
        "Fill the required keys before connecting (or leave blanks only when updating existing keys)."
      );
    }
    if (code === "env_only") {
      return (
        labels.env_only ??
        "This integration is configured in Vercel env vars, not from this form."
      );
    }
    return (
      labels[code ?? ""] ??
      labels.connectError ??
      code ??
      "Could not connect."
    );
  };

  const isEnvOnlyItem = (item: IntegrationItem | null) =>
    Boolean(
      item &&
        (item.config?.envOnly === "true" ||
          item.id === "firebase_client" ||
          item.id === "firebase_admin"),
    );

  const openConnectForm = (item: IntegrationItem) => {
    setModalError(null);
    setApiKey("");
    setYoutubeChannelUrl(item.config?.channelUrl ?? "");
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
    setSmtpUser("");
    setSmtpPass("");
    setSmtpPort("465");
    setOauthClientId("");
    setOauthClientSecret("");
    setOauthRefreshToken("");
    setCalendarId("primary");
    setConnectItem(item);
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

  const isStripe =
    connectItem?.id === "stripe" || connectItem?.id === "stripe_hosting";
  const isHostingStripe = connectItem?.id === "stripe_hosting";
  const isResend = connectItem?.id === "resend";
  const isSendGrid = connectItem?.id === "sendgrid";
  const isGmailSmtp = connectItem?.id === "gmail_smtp";
  const isTwilio = connectItem?.id === "twilio";
  const isYoutube = connectItem?.id === "youtube";
  const isGooglePlaces = connectItem?.id === "google_places";
  const isGemini = connectItem?.id === "gemini";
  const isGoogleCalendar = connectItem?.id === "google_calendar";
  const isFirebaseClient = connectItem?.id === "firebase_client";
  const isFirebaseAdmin = connectItem?.id === "firebase_admin";
  const isEnvOnly =
    connectItem?.config?.envOnly === "true" ||
    isFirebaseClient ||
    isFirebaseAdmin;

  const connect = async () => {
    if (!connectItem) {
      return;
    }

    if (isEnvOnly) {
      setConnectItem(null);
      setModalError(null);
      await load();
      return;
    }

    setIsSaving(true);
    setActionMessage(null);
    setModalError(null);

    let body: {
      config?: Record<string, string>;
      secrets?: Record<string, string>;
    };

    if (isStripe) {
      body = {
        config: {
          publishableKey,
          webhookUrl: isHostingStripe
            ? (labels.hostingStripeWebhookPath ??
              "/api/webhooks/stripe-hosting")
            : (labels.stripeWebhookPath ?? "/api/webhooks/stripe"),
        },
        secrets: {
          ...(secretKey ? { secretKey } : {}),
          ...(webhookSecret ? { webhookSecret } : {}),
          ...(publishableKey ? { publishableKey } : {}),
        },
      };
    } else if (isGmailSmtp) {
      body = {
        config: {
          host: configHost || "smtp.gmail.com",
          port: smtpPort || "465",
          fromEmail: fromEmail || smtpUser,
          fromName: fromName || labels.smtpDefaultFromName || "Nextgenmove",
          secure: "true",
          category: "Transactional email",
        },
        secrets: {
          host: configHost || "smtp.gmail.com",
          port: smtpPort || "465",
          ...(smtpUser ? { user: smtpUser } : {}),
          ...(smtpPass ? { pass: smtpPass } : {}),
          ...(fromEmail || smtpUser
            ? { fromEmail: fromEmail || smtpUser }
            : {}),
          ...(fromName ? { fromName } : {}),
          secure: "true",
        },
      };
    } else if (isResend || isSendGrid) {
      body = {
        config: {
          fromEmail,
          fromName:
            fromName ||
            (isResend
              ? labels.resendDefaultFromName || "Nextgenmove"
              : labels.sendgridDefaultFromName || "Nextgenmove"),
        },
        secrets: {
          ...(apiKey ? { apiKey } : {}),
          ...(fromEmail ? { fromEmail } : {}),
        },
      };
    } else if (isTwilio) {
      body = {
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
      };
    } else if (isYoutube) {
      body = {
        config: {
          category: "Media",
          ...(youtubeChannelUrl.trim()
            ? { channelUrl: youtubeChannelUrl.trim() }
            : {}),
        },
        secrets: { ...(apiKey ? { apiKey } : {}) },
      };
    } else if (isGooglePlaces) {
      body = {
        config: { category: "Maps & location" },
        secrets: { ...(apiKey ? { apiKey } : {}) },
      };
    } else if (isGemini) {
      body = {
        config: { category: "AI" },
        secrets: { ...(apiKey ? { apiKey } : {}) },
      };
    } else if (isGoogleCalendar) {
      body = {
        config: {
          category: "Scheduling",
          ...(oauthClientId ? { clientId: oauthClientId } : {}),
          ...(calendarId ? { calendarId } : {}),
        },
        secrets: {
          ...(oauthClientId ? { clientId: oauthClientId } : {}),
          ...(oauthClientSecret ? { clientSecret: oauthClientSecret } : {}),
          ...(oauthRefreshToken ? { refreshToken: oauthRefreshToken } : {}),
          ...(calendarId ? { calendarId } : {}),
        },
      };
    } else {
      setIsSaving(false);
      setModalError(
        labels.unsupportedConnect ??
          "This integration has no connect form yet.",
      );
      return;
    }

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
      setSmtpUser("");
      setSmtpPass("");
      setSmtpPort("465");
      setOauthClientId("");
      setOauthClientSecret("");
      setOauthRefreshToken("");
      setCalendarId("primary");
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

  const formatConnectedAt = (iso: string | null, connected: boolean) => {
    if (!connected || !iso) {
      return labels.neverConnected ?? "Never connected";
    }
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return labels.connectedJustNow ?? "Connected just now";
    if (mins < 60) {
      return (labels.connectedMinutesAgo ?? "Connected {n} min ago").replace(
        "{n}",
        String(mins),
      );
    }
    const hours = Math.round(mins / 60);
    if (hours < 48) {
      return (labels.connectedHoursAgo ?? "Connected {n}h ago").replace(
        "{n}",
        String(hours),
      );
    }
    return (labels.connectedOn ?? "Connected {date}").replace(
      "{date}",
      new Date(iso).toLocaleDateString(),
    );
  };

  const toggle = async (item: IntegrationItem) => {
    if (isEnvOnlyItem(item)) {
      openConnectForm(item);
      return;
    }

    if (item.status === "connected") {
      await disconnect(item.id);
      return;
    }
    openConnectForm(item);
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const connected = item.status === "connected";
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-radius border border-border bg-grad-card p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <IntegrationIcon
                    id={item.id}
                    name={item.name}
                    iconUrl={item.iconUrl}
                  />
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
                    {isEnvOnlyItem(item)
                      ? connected
                        ? (labels.envConfigured ?? "Configured via env")
                        : (labels.envMissing ?? "Env vars missing")
                      : formatConnectedAt(item.connectedAt, connected)}
                  </p>
                  <div className="flex items-center gap-2">
                    {!isEnvOnlyItem(item) && connected ? (
                      <button
                        type="button"
                        onClick={() => openConnectForm(item)}
                        className="text-[11px] font-semibold text-fill-accent underline-offset-2 hover:underline"
                      >
                        {labels.editKeys ?? "Edit"}
                      </button>
                    ) : null}
                    {isEnvOnlyItem(item) ? (
                      <button
                        type="button"
                        onClick={() => openConnectForm(item)}
                        className="rounded-full border border-border bg-surface-1 px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary"
                      >
                        {labels.viewEnv ?? "View env"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={connected}
                        aria-label={
                          connected
                            ? (labels.disconnect ?? "Disconnect")
                            : (labels.connect ?? "Connect")
                        }
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
                    )}
                  </div>
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
        title={
          isEnvOnly
            ? labels.envTitle || "Environment variables"
            : connectItem?.status === "connected"
              ? labels.editTitle || "Update integration keys"
              : labels.connectTitle || "Connect integration"
        }
        footer={
          <div className="flex justify-end gap-2">
            {isEnvOnly ? (
              <Button
                onClick={() => {
                  setConnectItem(null);
                  setModalError(null);
                  void load();
                }}
              >
                {labels.close || "Close"}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setConnectItem(null);
                    setModalError(null);
                  }}
                >
                  {labels.cancel || "Cancel"}
                </Button>
                <Button
                  disabled={
                    isSaving ||
                    !(
                      isStripe ||
                      isResend ||
                      isSendGrid ||
                      isGmailSmtp ||
                      isTwilio ||
                      isYoutube ||
                      isGooglePlaces ||
                      isGemini ||
                      isGoogleCalendar
                    )
                  }
                  onClick={() => void connect()}
                >
                  {isSaving
                    ? labels.connecting || "Connecting…"
                    : connectItem?.status === "connected"
                      ? labels.saveKeys || "Save keys"
                      : labels.connect || "Connect"}
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {modalError ? (
            <p className="text-sm text-text-warning" role="alert">
              {modalError}
            </p>
          ) : null}
          {!isEnvOnly && connectItem?.status === "connected" ? (
            <p className="text-xs text-text-muted">
              {labels.editKeysHint ??
                "Leave a field blank to keep the existing value. Saving re-enables this integration."}
            </p>
          ) : null}
          {isEnvOnly ? (
            isFirebaseClient ? (
              <>
                <p className="text-sm text-text-secondary">
                  {labels.firebaseClientEnvHint ??
                    "Firebase Client SDK is wired from Vercel environment variables (NEXT_PUBLIC_FIREBASE_*), not from this form. Host / API key fields do not apply."}
                </p>
                <ul className="list-inside list-disc space-y-1 font-mono text-xs text-text-muted">
                  <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                  <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                  <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                  <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                  <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
                  <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
                </ul>
                <p className="text-xs text-text-muted">
                  {labels.firebaseClientEnvHelp ??
                    "Copy values from Firebase Console → Project settings → Your apps → Web app. After saving in Vercel, redeploy — this card then shows Connected."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  {labels.firebaseAdminEnvHint ??
                    "Firebase Admin SDK uses the service account on the server (FIREBASE_ADMIN_*), not a Host / API key paste here."}
                </p>
                <ul className="list-inside list-disc space-y-1 font-mono text-xs text-text-muted">
                  <li>FIREBASE_ADMIN_PROJECT_ID</li>
                  <li>FIREBASE_ADMIN_CLIENT_EMAIL</li>
                  <li>FIREBASE_ADMIN_PRIVATE_KEY</li>
                </ul>
                <p className="text-xs text-text-muted">
                  {labels.firebaseAdminEnvHelp ??
                    "From Firebase Console → Project settings → Service accounts → Generate new key. Set these in Vercel (Production), then redeploy."}
                </p>
              </>
            )
          ) : isStripe ? (
            <>
              <Input
                id="stripe-secret"
                type="password"
                label={
                  isHostingStripe
                    ? (labels.hostingStripeSecretKey ??
                      labels.stripeSecretKey ??
                      "Secret key (sk_…)")
                    : (labels.stripeSecretKey ?? "Secret key (sk_…)")
                }
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
              />
              <Input
                id="stripe-publishable"
                label={
                  isHostingStripe
                    ? (labels.hostingStripePublishableKey ??
                      labels.stripePublishableKey ??
                      "Publishable key (pk_…)")
                    : (labels.stripePublishableKey ?? "Publishable key (pk_…)")
                }
                value={publishableKey}
                onChange={(event) => setPublishableKey(event.target.value)}
              />
              <Input
                id="stripe-webhook"
                type="password"
                label={
                  isHostingStripe
                    ? (labels.hostingStripeWebhookSecret ??
                      labels.stripeWebhookSecret ??
                      "Webhook signing secret (whsec_…)")
                    : (labels.stripeWebhookSecret ??
                      "Webhook signing secret (whsec_…)")
                }
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
              {isHostingStripe ? (
                <p className="text-xs text-text-muted">
                  {labels.hostingStripeWebhookHelp ??
                    "In Stripe Dashboard → Developers → Webhooks, add endpoint: {APP_URL}/api/webhooks/stripe-hosting — events: payment_intent.succeeded"}
                </p>
              ) : labels.stripeWebhookHelp ? (
                <p className="text-xs text-text-muted">{labels.stripeWebhookHelp}</p>
              ) : null}
            </>
          ) : isGmailSmtp ? (
            <>
              <Input
                id="smtp-host"
                label={labels.smtpHost ?? "SMTP host"}
                value={configHost || "smtp.gmail.com"}
                onChange={(event) => setConfigHost(event.target.value)}
                placeholder="smtp.gmail.com"
              />
              <Input
                id="smtp-port"
                label={labels.smtpPort ?? "Port"}
                value={smtpPort}
                onChange={(event) => setSmtpPort(event.target.value)}
                placeholder="465"
              />
              <Input
                id="smtp-user"
                type="email"
                label={labels.smtpUser ?? "Gmail address"}
                value={smtpUser}
                onChange={(event) => setSmtpUser(event.target.value)}
                placeholder="you@gmail.com"
              />
              <Input
                id="smtp-pass"
                type="password"
                label={labels.smtpPass ?? "App password"}
                value={smtpPass}
                onChange={(event) => setSmtpPass(event.target.value)}
              />
              <Input
                id="smtp-from-email"
                type="email"
                label={labels.smtpFromEmail ?? "From email"}
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
              />
              <Input
                id="smtp-from-name"
                label={labels.smtpFromName ?? "From name"}
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
              />
              <p className="text-xs text-text-muted">
                {labels.smtpHelp ??
                  "Create a Google App Password (Google Account → Security → 2-Step Verification → App passwords). Used for OTPs, notifications, and CRM email."}
              </p>
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
              <p className="text-sm text-text-secondary">
                {labels.youtubeHint ??
                  "Add your Data API key and the channel or playlist to sync. After that, Sync now pulls videos automatically — no need to paste individual video links."}
              </p>
              <Input
                id="youtube-api-key"
                type="password"
                label={labels.youtubeApiKey ?? "YouTube Data API key"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <Input
                id="youtube-channel-url"
                label={
                  labels.youtubeChannelUrl ??
                  "Channel, playlist, or @handle to sync"
                }
                value={youtubeChannelUrl}
                onChange={(event) => setYoutubeChannelUrl(event.target.value)}
                placeholder={
                  labels.youtubeChannelPlaceholder ??
                  "https://youtube.com/@yourchannel or playlist URL"
                }
              />
              <p className="text-xs text-text-muted">
                {labels.youtubeHelp ??
                  "Google Cloud → enable YouTube Data API v3 → create an API key. Sync uses this channel’s uploads (or the playlist you enter)."}
              </p>
            </>
          ) : isGooglePlaces ? (
            <>
              {labels.googlePlacesHint ? (
                <p className="text-sm text-text-secondary">
                  {labels.googlePlacesHint}
                </p>
              ) : (
                <p className="text-sm text-text-secondary">
                  Connect a Google Places API key so signup can autocomplete
                  country, city, and town worldwide.
                </p>
              )}
              <Input
                id="google-places-api-key"
                type="password"
                label={labels.googlePlacesApiKey ?? "Google Places API key"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              {labels.googlePlacesHelp ? (
                <p className="text-xs text-text-muted">{labels.googlePlacesHelp}</p>
              ) : (
                <p className="text-xs text-text-muted">
                  Google Cloud Console → enable Places API → Credentials → API
                  key. Restrict the key to Places Autocomplete and Place Details.
                </p>
              )}
            </>
          ) : isGemini ? (
            <>
              <p className="text-sm text-text-secondary">
                {labels.geminiHint ??
                  "Paste a Gemini API key from Google AI Studio to power NGM Assistant and the public chatbot."}
              </p>
              <Input
                id="gemini-api-key"
                type="password"
                label={labels.geminiApiKey ?? "Gemini API key"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              {labels.geminiHelp ? (
                <p className="text-xs text-text-muted">{labels.geminiHelp}</p>
              ) : (
                <p className="text-xs text-text-muted">
                  Google AI Studio → Get API key. You can also set GEMINI_API_KEY
                  in Vercel as a fallback.
                </p>
              )}
            </>
          ) : isGoogleCalendar ? (
            <>
              <p className="text-sm text-text-secondary">
                {labels.googleCalendarHint ??
                  "Paste OAuth 2.0 client credentials and a refresh token from Google Cloud Console so interview scheduling can create Calendar events."}
              </p>
              <Input
                id="google-calendar-client-id"
                label={labels.googleCalendarClientId ?? "OAuth client ID"}
                value={oauthClientId}
                onChange={(event) => setOauthClientId(event.target.value)}
                placeholder="….apps.googleusercontent.com"
              />
              <Input
                id="google-calendar-client-secret"
                type="password"
                label={
                  labels.googleCalendarClientSecret ?? "OAuth client secret"
                }
                value={oauthClientSecret}
                onChange={(event) => setOauthClientSecret(event.target.value)}
              />
              <Input
                id="google-calendar-refresh-token"
                type="password"
                label={
                  labels.googleCalendarRefreshToken ?? "OAuth refresh token"
                }
                value={oauthRefreshToken}
                onChange={(event) => setOauthRefreshToken(event.target.value)}
              />
              <Input
                id="google-calendar-id"
                label={labels.googleCalendarId ?? "Calendar ID"}
                value={calendarId}
                onChange={(event) => setCalendarId(event.target.value)}
                placeholder="primary"
              />
              {labels.googleCalendarHelp ? (
                <p className="text-xs text-text-muted">
                  {labels.googleCalendarHelp}
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  Enable Google Calendar API. Create a Web OAuth client, complete
                  one offline consent flow to obtain a refresh token, then paste
                  it here. Events are created when employers schedule interviews.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              {labels.unsupportedConnect ??
                "This integration has no connect form yet."}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
