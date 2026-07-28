"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Select } from "@/components/ui";
import { HostingPaymentElementPanel } from "@/components/admin/hosting-payment-element-panel";
import type {
  HostingCatalog,
  HostingPlan,
  HostingQuote,
  HostingSubscriptionStatus,
} from "@/lib/billing/hosting-catalog-shared";
import { buildHostingQuote } from "@/lib/billing/hosting-catalog-shared";
import { cn } from "@/lib/utils";

type Step = "plans" | "summary" | "payment" | "success";

interface AdminHostingViewProps {
  labels: Record<string, string>;
}

function money(
  amount: number,
  symbol: string,
  opts?: { compact?: boolean },
): string {
  const formatted = opts?.compact
    ? String(amount)
    : amount.toLocaleString(undefined, {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
      });
  return `${symbol}${formatted}`;
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-text-success"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 8.2 6.4 11l6.1-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminHostingView({ labels }: AdminHostingViewProps) {
  const [catalog, setCatalog] = useState<HostingCatalog | null>(null);
  const [subscription, setSubscription] =
    useState<HostingSubscriptionStatus | null>(null);
  const [stripeLive, setStripeLive] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("plans");
  const [planId, setPlanId] = useState("startup");
  const [periodId, setPeriodId] = useState("12");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState("");
  const [quote, setQuote] = useState<HostingQuote | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/hosting", { cache: "no-store" });
      if (!response.ok) {
        setLoadError(labels.loadError || "Could not load hosting plans.");
        return;
      }
      const payload = (await response.json()) as {
        catalog: HostingCatalog;
        stripeLive: boolean;
        subscription?: HostingSubscriptionStatus;
      };
      setCatalog(payload.catalog);
      setStripeLive(Boolean(payload.stripeLive));
      setSubscription(payload.subscription ?? null);
      setPlanId(
        payload.subscription?.planId ||
          payload.catalog.defaultPlanId ||
          "startup",
      );
      setPeriodId(
        payload.subscription?.periodId ||
          payload.catalog.defaultPeriodId ||
          "12",
      );
    } catch {
      setLoadError(labels.loadError || "Could not load hosting plans.");
    }
  }, [labels.loadError]);

  const markHostingActive = useCallback(
    async (intentId: string) => {
      try {
        const response = await fetch("/api/admin/hosting/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: intentId }),
        });
        if (!response.ok) {
          setMessage(
            labels.activateFailed ||
              "Payment received, but Hosting Active could not be set. Refresh or contact support.",
          );
          return false;
        }
        await load();
        return true;
      } catch {
        setMessage(
          labels.activateFailed ||
            "Payment received, but Hosting Active could not be set. Refresh or contact support.",
        );
        return false;
      }
    },
    [labels.activateFailed, load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      setStep("success");
      const stored = window.sessionStorage.getItem("hostingPaymentIntentId");
      if (stored) {
        void markHostingActive(stored).then(() => {
          window.sessionStorage.removeItem("hostingPaymentIntentId");
        });
      } else {
        void load();
      }
    }
  }, [load, markHostingActive]);

  const hostingActive = subscription?.status === "active";

  const plan: HostingPlan | null = useMemo(() => {
    if (!catalog) return null;
    return catalog.plans.find((item) => item.id === planId) ?? catalog.plans[0] ?? null;
  }, [catalog, planId]);

  const liveQuote = useMemo(() => {
    if (!catalog) return null;
    return buildHostingQuote(catalog, planId, periodId);
  }, [catalog, planId, periodId]);

  const startCheckout = () => {
    if (!plan || !liveQuote) return;
    setQuote(liveQuote);
    setStep("summary");
    setMessage(null);
    setClientSecret(null);
  };

  const continueToPayment = async () => {
    if (!plan) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/hosting/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, periodId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        clientSecret?: string;
        publishableKey?: string;
        paymentIntentId?: string;
        returnUrl?: string;
        quote?: HostingQuote;
      };
      if (!response.ok) {
        setMessage(
          labels[payload.error ?? ""] ||
            (payload.error === "hosting_stripe_not_configured"
              ? labels.stripeNotConfigured ||
                "Connect Hosting Plan (Stripe) under Integrations first."
              : labels.paymentIntentFailed ||
                "Could not start payment. Try again."),
        );
        return;
      }
      setClientSecret(payload.clientSecret ?? null);
      setPublishableKey(payload.publishableKey ?? null);
      setPaymentIntentId(payload.paymentIntentId ?? null);
      if (payload.paymentIntentId) {
        window.sessionStorage.setItem(
          "hostingPaymentIntentId",
          payload.paymentIntentId,
        );
      }
      setReturnUrl(payload.returnUrl || `${window.location.origin}/admin/hosting?paid=1`);
      if (payload.quote) setQuote(payload.quote);
      setStep("payment");
    } catch {
      setMessage(labels.paymentIntentFailed || "Could not start payment. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-warning" role="alert">
          {loadError}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          {labels.retry || "Retry"}
        </Button>
      </div>
    );
  }

  if (!catalog || !plan) {
    return (
      <p className="text-sm text-text-secondary">
        {labels.loading || "Loading…"}
      </p>
    );
  }

  if (step === "success") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-radius border border-border bg-grad-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-success text-text-success">
          <CheckIcon />
        </div>
        <p className="inline-flex rounded-full bg-bg-success px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-success">
          {labels.hostingActiveBadge || "Hosting Active"}
        </p>
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.successTitle || "Hosting is now active on NextGen Move"}
        </h1>
        <p className="text-sm text-text-secondary">
          {labels.successBody ||
            "Payment confirmed. Hosting Active is live for nextgenmove.agency."}
        </p>
        {subscription?.planName ? (
          <p className="text-sm font-medium text-text-primary">
            {subscription.planName}
            {subscription.expiresAt
              ? ` · ${labels.activeUntil || "Active until"} ${subscription.expiresAt.slice(0, 10)}`
              : null}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={() => {
            setStep("plans");
            void load();
          }}
        >
          {labels.backToPlans || "Back to plans"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
            {labels.eyebrow || "Hosting"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl text-text-primary">
              {labels.title || "Agency hosting"}
            </h1>
            {hostingActive ? (
              <span className="rounded-full bg-bg-success px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-success">
                {labels.hostingActiveBadge || "Hosting Active"}
              </span>
            ) : (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {labels.hostingInactiveBadge || "Not active"}
              </span>
            )}
          </div>
          <p className="max-w-xl text-sm text-text-secondary">
            {hostingActive
              ? labels.activeSubtitle ||
                `Hosting is active on nextgenmove.agency${subscription?.planName ? ` · ${subscription.planName}` : ""}${subscription?.expiresAt ? ` · until ${subscription.expiresAt.slice(0, 10)}` : ""}.`
              : labels.subtitle ||
                "Purchase Hostinger agency hosting for NextGen Move — plan selection, order summary, then secure card payment."}
          </p>
        </div>
        <Image
          src="/integrations/hostinger.svg"
          alt={catalog.partnerName || "Hostinger"}
          width={96}
          height={20}
          className="h-5 w-auto max-h-5 max-w-[6rem] object-contain object-right"
          priority
        />
      </header>

      {!stripeLive ? (
        <p className="rounded-radius-sm border border-border bg-bg-purple px-3 py-2 text-sm text-text-primary">
          {labels.stripeNotConfigured ||
            "Connect Hosting Plan (Stripe) under Integrations to enable checkout."}
        </p>
      ) : null}

      {step === "plans" ? (
        <section className="overflow-hidden rounded-radius border border-border bg-surface-1 shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <h2 className="font-serif text-3xl text-text-primary">
                  {plan.name}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{plan.tagline}</p>
              </div>

              <div className="relative">
                <div className="flex gap-6 border-b border-border pb-3">
                  {catalog.plans.map((item) => {
                    const active = item.id === plan.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPlanId(item.id)}
                        className={cn(
                          "relative pb-1 text-sm font-semibold transition-colors",
                          active
                            ? "text-fill-accent"
                            : "text-text-muted hover:text-text-primary",
                        )}
                      >
                        {item.shortName}
                        {active ? (
                          <span className="absolute -bottom-[13px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-fill-accent shadow-[0_0_0_4px_var(--bg-purple)]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-radius border border-border bg-surface-2/60 p-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {labels.resourcesTitle || "Resources"}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {plan.resources.map((resource) => (
                    <li
                      key={resource}
                      className="border-b border-dashed border-border/80 pb-2 text-sm text-text-primary last:border-0 last:pb-0"
                    >
                      {resource}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="border-t border-border bg-grad-card p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-text-muted line-through">
                  {money(plan.listMonthlyPrice, catalog.currencySymbol)}
                </span>
                <span className="rounded-full bg-fill-accent px-2.5 py-0.5 text-[11px] font-semibold text-on-accent">
                  {(labels.saveBadge || "SAVE {percent}%").replace(
                    "{percent}",
                    String(plan.savePercent),
                  )}
                </span>
              </div>
              <p className="font-serif text-4xl text-text-primary">
                {money(plan.monthlyPrice, catalog.currencySymbol)}
                <span className="text-base font-sans text-text-secondary">
                  {labels.perMonth || "/mo"}
                </span>
              </p>
              <Button
                type="button"
                className="mt-5 w-full bg-fill-accent text-on-accent hover:bg-fill-accent-strong"
                disabled={!stripeLive}
                onClick={startCheckout}
              >
                {labels.choosePlan || "Choose plan"}
              </Button>
              <p className="mt-2 text-xs text-text-muted">
                {(
                  labels.renewHint ||
                  "For 24-month term. {price}/mo when you renew"
                ).replace(
                  "{price}",
                  money(plan.renewMonthlyPrice, catalog.currencySymbol),
                )}
              </p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-2 text-sm">
                    <CheckIcon />
                    <span
                      className={cn(
                        "text-text-primary",
                        feature.underlined && "underline decoration-dashed underline-offset-4",
                      )}
                    >
                      {feature.label}
                    </span>
                    {feature.badge ? (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          feature.badge === "FREE"
                            ? "bg-bg-success text-text-success"
                            : "bg-bg-purple text-fill-accent",
                        )}
                      >
                        {feature.badge}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>
      ) : null}

      {step === "summary" || step === "payment" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-4">
            <section className="rounded-radius border border-border bg-surface-1 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-radius-sm bg-bg-purple text-fill-accent">
                  <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <rect x="2" y="3" width="12" height="3" rx="0.75" />
                    <rect x="2" y="7" width="12" height="3" rx="0.75" />
                    <rect x="2" y="11" width="12" height="2" rx="0.75" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {(labels.planCardTitle || "{name} plan").replace(
                      "{name}",
                      plan.shortName,
                    )}
                  </h2>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-serif text-2xl text-text-primary">
                    {money(
                      liveQuote?.monthlyPrice ?? plan.monthlyPrice,
                      catalog.currencySymbol,
                    )}
                    <span className="text-sm font-sans text-text-secondary">
                      {labels.perMonth || "/mo"}
                    </span>
                  </p>
                  <p className="text-xs text-text-muted line-through">
                    {money(
                      liveQuote?.listMonthlyPrice ?? plan.listMonthlyPrice,
                      catalog.currencySymbol,
                    )}
                    {labels.perMonth || "/mo"}
                  </p>
                  {liveQuote ? (
                    <p className="mt-1 text-[11px] text-text-muted">
                      {(
                        labels.periodMath ||
                        "{price}/mo × {months} mo = {subtotal}"
                      )
                        .replace(
                          "{price}",
                          money(liveQuote.monthlyPrice, catalog.currencySymbol),
                        )
                        .replace("{months}", String(liveQuote.months))
                        .replace(
                          "{subtotal}",
                          money(
                            liveQuote.planSubtotal,
                            catalog.currencySymbol,
                          ),
                        )}
                    </p>
                  ) : null}
                  {liveQuote ? (
                    <span className="mt-1 inline-flex rounded-full bg-bg-success px-2 py-0.5 text-[11px] font-semibold text-text-success">
                      {(labels.saveAmount || "Save {amount}").replace(
                        "{amount}",
                        money(liveQuote.savings, catalog.currencySymbol),
                      )}
                    </span>
                  ) : null}
                </div>
              </div>

              <Select
                label={labels.periodLabel || "Period"}
                value={periodId}
                options={catalog.periods.map((period) => ({
                  value: period.id,
                  label: period.label,
                }))}
                onChange={(event) => {
                  setPeriodId(event.target.value);
                  setClientSecret(null);
                  if (step === "payment") setStep("summary");
                }}
              />
              <p className="mt-2 text-xs text-text-muted">
                {(liveQuote?.months === 1
                  ? labels.periodRenewHintOneMonth ||
                    "Renews after 1 month at {price}/mo. Cancel anytime."
                  : labels.periodRenewHint ||
                    "Renews after {months} months at {price}/mo for {months} months. Cancel anytime."
                )
                  .replaceAll("{months}", String(liveQuote?.months ?? 12))
                  .replace(
                    "{price}",
                    money(plan.renewMonthlyPrice, catalog.currencySymbol),
                  )}
              </p>

              {periodId !== catalog.dealPeriodId ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-radius bg-fill-primary px-4 py-3 text-on-primary">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-radius-sm bg-text-success text-xs font-bold text-white">
                      %
                    </span>
                    <p className="text-sm">
                      {labels.dealBanner ||
                        "Switch to a 24-month subscription for the biggest savings."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-on-primary text-on-primary"
                    onClick={() => {
                      setPeriodId(catalog.dealPeriodId);
                      setClientSecret(null);
                      if (step === "payment") setStep("summary");
                    }}
                  >
                    {labels.getDeal || "Get deal"}
                  </Button>
                </div>
              ) : null}

              <div className="mt-4 flex items-start gap-2 rounded-radius-sm bg-bg-success px-3 py-2 text-sm text-text-success">
                <CheckIcon />
                <p>
                  {labels.freeDomainNote ||
                    "Great news! You get a FREE domain for 1 year with this order."}
                </p>
              </div>
            </section>

            {step === "payment" && clientSecret && publishableKey ? (
              <section className="rounded-radius border border-border bg-surface-1 p-5 shadow-sm">
                <h2 className="mb-1 font-serif text-xl text-text-primary">
                  {labels.paymentTitle || "Card details"}
                </h2>
                <p className="mb-4 text-sm text-text-secondary">
                  {labels.paymentHelp ||
                    "Enter your card below. Payment is processed securely in the background — you stay on NextGen Move."}
                </p>
                <HostingPaymentElementPanel
                  clientSecret={clientSecret}
                  publishableKey={publishableKey}
                  returnUrl={returnUrl}
                  labels={labels}
                  onSuccess={(intentId) => {
                    const id = intentId || paymentIntentId;
                    setStep("success");
                    if (id) {
                      window.sessionStorage.setItem(
                        "hostingPaymentIntentId",
                        id,
                      );
                      void markHostingActive(id);
                    }
                  }}
                  onError={(errorMessage) => setMessage(errorMessage)}
                />
              </section>
            ) : null}

            {message ? (
              <p className="text-sm text-text-warning" role="alert">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep("plans");
                  setClientSecret(null);
                  setMessage(null);
                }}
              >
                {labels.back || "Back"}
              </Button>
            </div>
          </div>

          <aside className="h-fit rounded-radius border border-border bg-surface-1 p-5 shadow-sm lg:sticky lg:top-4">
            <h2 className="font-serif text-2xl text-text-primary">
              {labels.orderSummary || "Order summary"}
            </h2>
            {liveQuote ? (
              <div className="mt-4 space-y-3 text-sm">
                <p className="font-semibold text-text-primary">{plan.name}</p>
                <div className="flex justify-between gap-3">
                  <span className="text-text-secondary">
                    {(liveQuote.months === 1
                      ? labels.periodLineOneMonth || "1-month period"
                      : labels.periodLine || "{months}-month period"
                    ).replace("{months}", String(liveQuote.months))}
                  </span>
                  <span className="text-right">
                    <span className="mr-2 text-text-muted line-through">
                      {money(liveQuote.planListSubtotal, catalog.currencySymbol)}
                    </span>
                    <span className="font-semibold text-text-primary">
                      {money(liveQuote.planSubtotal, catalog.currencySymbol)}
                    </span>
                  </span>
                </div>
                {catalog.addOns.map((addOn) => (
                  <div key={addOn.id} className="flex justify-between gap-3">
                    <span className="text-text-secondary">{addOn.label}</span>
                    <span className="text-right">
                      {addOn.listAmount > addOn.amount ? (
                        <span className="mr-2 text-text-muted line-through">
                          {money(addOn.listAmount, catalog.currencySymbol)}
                        </span>
                      ) : null}
                      <span className="font-semibold text-text-primary">
                        {money(addOn.amount, catalog.currencySymbol)}
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-text-secondary">
                    {labels.taxes || "Taxes"}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {money(liveQuote.taxAmount, catalog.currencySymbol)}
                  </span>
                </div>
                <div className="flex items-end justify-between pt-1">
                  <span className="text-base font-semibold text-text-primary">
                    {labels.total || "Total"}
                  </span>
                  <span className="text-right">
                    <span className="mr-2 text-sm text-text-muted line-through">
                      {money(liveQuote.listTotal, catalog.currencySymbol)}
                    </span>
                    <span className="font-serif text-3xl text-text-primary">
                      {money(liveQuote.total, catalog.currencySymbol)}
                    </span>
                  </span>
                </div>
              </div>
            ) : null}

            {step === "summary" ? (
              <Button
                type="button"
                className="mt-5 w-full bg-fill-accent text-on-accent hover:bg-fill-accent-strong"
                disabled={busy || !stripeLive}
                onClick={() => void continueToPayment()}
              >
                {busy
                  ? labels.continuing || "Continuing…"
                  : labels.continue || "Continue"}
              </Button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
