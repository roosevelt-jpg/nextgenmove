"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Modal } from "@/components/ui";
import { currencySymbol as resolveCurrencySymbol } from "@/lib/public/currency";

export interface StudentWalletPanelProps {
  labels: Record<string, string>;
  /** Compact mode for embedding in dashboard (shows recent N). */
  compact?: boolean;
  historyLimit?: number;
}

interface TopUpPackage {
  id: string;
  label: string;
  credits: number;
  priceEur: number;
}

interface WalletTransaction {
  id: string;
  direction: "earn" | "spend";
  amount: number;
  source: string;
  sourceKey: string;
  sourceLabel: string;
  createdAt: string | null;
}

function EmvChip() {
  return (
    <svg
      viewBox="0 0 40 30"
      className="h-8 w-10 shrink-0 drop-shadow-sm sm:h-9 sm:w-11"
      aria-hidden
    >
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="29"
        rx="4"
        fill="url(#walletChipGrad)"
        stroke="rgba(255,255,255,0.35)"
      />
      <path
        d="M0 10h40M0 20h40M14 0v30M26 0v30"
        stroke="rgba(26,26,24,0.22)"
        strokeWidth="1"
      />
      <defs>
        <linearGradient id="walletChipGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4d9a8" />
          <stop offset="55%" stopColor="#c97a2e" />
          <stop offset="100%" stopColor="#9a6a3c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ContactlessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white/80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M8.5 8.2c1.6 1.5 1.6 6.1 0 7.6" strokeLinecap="round" />
      <path d="M11.5 6c2.5 2.3 2.5 9.7 0 12" strokeLinecap="round" />
      <path d="M14.5 3.8c3.4 3.1 3.4 13.3 0 16.4" strokeLinecap="round" />
    </svg>
  );
}

export function StudentWalletPanel({
  labels,
  compact = false,
  historyLimit = 50,
}: StudentWalletPanelProps) {
  const [credits, setCredits] = useState(0);
  const [packages, setPackages] = useState<TopUpPackage[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [currency, setCurrency] = useState("EUR");
  const [currencySymbol, setCurrencySymbol] = useState("€");
  const [creditsPerEuro, setCreditsPerEuro] = useState(4);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpStatus, setTopUpStatus] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const applyWalletPayload = (data: {
    credits: number;
    packages: TopUpPackage[];
    stripeEnabled: boolean;
    transactions: WalletTransaction[];
    currency?: string;
    currencySymbol?: string;
    creditsPerEuro?: number;
  }) => {
    setCredits(data.credits);
    setPackages(data.packages ?? []);
    setStripeEnabled(Boolean(data.stripeEnabled));
    setTransactions(data.transactions ?? []);
    if (data.currency) setCurrency(data.currency);
    if (data.currencySymbol) {
      setCurrencySymbol(data.currencySymbol);
    } else if (data.currency) {
      setCurrencySymbol(resolveCurrencySymbol(data.currency));
    }
    if (typeof data.creditsPerEuro === "number" && data.creditsPerEuro > 0) {
      setCreditsPerEuro(data.creditsPerEuro);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(
      `/api/student/credits/wallet?limit=${historyLimit}`,
    );
    setLoading(false);
    if (!response.ok) return;
    const data = (await response.json()) as {
      credits: number;
      packages: TopUpPackage[];
      stripeEnabled: boolean;
      transactions: WalletTransaction[];
      currency?: string;
      currencySymbol?: string;
      creditsPerEuro?: number;
    };
    applyWalletPayload(data);
  }, [historyLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topup = params.get("topup");
    if (topup === "success") {
      setTopUpStatus(
        labels.topUpSuccess ??
          "Payment received. Updating your balance…",
      );
      let attempts = 0;
      const baseline = credits;
      const poll = async () => {
        attempts += 1;
        const response = await fetch(
          `/api/student/credits/wallet?limit=${historyLimit}`,
        );
        if (response.ok) {
          const data = (await response.json()) as {
            credits: number;
            packages: TopUpPackage[];
            stripeEnabled: boolean;
            transactions: WalletTransaction[];
            currency?: string;
            currencySymbol?: string;
            creditsPerEuro?: number;
          };
          applyWalletPayload(data);
          if (data.credits > baseline || attempts >= 8) {
            setTopUpStatus(
              labels.topUpSuccess ?? "Top-up successful. Balance updated.",
            );
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
        }
        if (attempts < 8) {
          window.setTimeout(() => void poll(), 1500);
        } else {
          setTopUpStatus(
            labels.topUpSuccessPending ??
              "Payment succeeded. Refresh in a moment if balance is unchanged.",
          );
        }
      };
      void poll();
    } else if (topup === "cancelled") {
      setTopUpStatus(labels.topUpCancelled ?? "Top-up cancelled.");
    }
    // Only run on mount for ?topup= query — credits baseline captured once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buyPackage = async (packageId: string) => {
    setBuyingId(packageId);
    setTopUpStatus(null);
    if (!stripeEnabled) {
      setTopUpStatus(
        labels.topUpStripeRequired ??
          "Connect Stripe under Admin → Integrations before card top-ups work.",
      );
    }
    const response = await fetch("/api/student/credits/top-up", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ packageId }),
    });
    setBuyingId(null);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setTopUpStatus(
        labels[payload?.error ?? ""] ??
          labels.topUpFailed ??
          "Could not start top-up. Try again.",
      );
      return;
    }
    const payload = (await response.json()) as {
      mode?: string;
      url?: string;
    };
    if (payload.mode === "stripe" && payload.url) {
      setTopUpStatus(
        labels.topUpRedirecting ??
          "Opening Stripe checkout to enter your card details…",
      );
      // Navigate to Stripe hosted checkout (external redirect).
      // eslint-disable-next-line react-hooks/immutability -- intentional full-page redirect
      window.location.assign(payload.url);
      return;
    }
    setTopUpStatus(
      labels.topUpRequested ?? "Request sent — pending admin approval.",
    );
    setTopUpOpen(false);
    await load();
  };

  const visibleTx = compact ? transactions.slice(0, 8) : transactions;
  const fiatApprox =
    creditsPerEuro > 0 ? credits / creditsPerEuro : null;

  const formatWhen = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const txLabel = (tx: WalletTransaction) =>
    labels[tx.sourceKey] ?? tx.sourceLabel ?? tx.source;

  const openTopUp = () => {
    setTopUpStatus(null);
    setTopUpOpen(true);
  };

  return (
    <section className="space-y-4 rounded-radius border border-border bg-grad-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {labels.walletEyebrow ?? "Wallet"}
          </p>
          <h2 className="font-serif text-xl text-text-primary">
            {labels.walletTitle ?? "Your credits"}
          </h2>
          {labels.walletSubtitle ? (
            <p className="mt-1 max-w-lg text-sm text-text-secondary">
              {labels.walletSubtitle}
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          type="button"
          disabled={!packages.length}
          title={
            !packages.length
              ? labels.topUpNoPackages ?? "No packages available"
              : undefined
          }
          onClick={openTopUp}
        >
          {labels.topUpButton ?? "Top up"}
        </Button>
      </div>

      <div className="wallet-atm-card relative z-0 p-5 sm:p-6">
        <div className="relative z-10 flex h-full flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {labels.walletCardBrand ?? "Nextgenmove"}
              </p>
              <p className="mt-1 font-serif text-sm font-medium text-white/90">
                {labels.walletCardType ?? "Credit wallet"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ContactlessIcon />
              <EmvChip />
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
              {labels.walletCardBalanceLabel ?? "Available balance"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-serif text-[clamp(1.85rem,5vw,2.35rem)] font-semibold leading-none tracking-tight text-white">
                {loading ? "…" : credits.toLocaleString()}
              </span>
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-white/85">
                {labels.walletCreditsUnit ?? "CR"}
              </span>
            </div>
            {fiatApprox != null && Number.isFinite(fiatApprox) ? (
              <p className="mt-2 flex items-center gap-1.5 font-mono text-sm text-white/80">
                <span className="text-base font-semibold text-white">
                  {currencySymbol}
                </span>
                <span>
                  {loading
                    ? "…"
                    : fiatApprox.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                  {currency}
                </span>
              </p>
            ) : (
              <p className="mt-2 font-mono text-sm text-white/80">
                <span className="text-base font-semibold text-white">
                  {currencySymbol}
                </span>{" "}
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                  {currency}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/50">
                {labels.walletCardNumberLabel ?? "Card"}
              </p>
              <p className="mt-0.5 font-mono text-xs tracking-[0.2em] text-white/85">
                •••• •••• •••• CRDT
              </p>
            </div>
            <button
              type="button"
              disabled={!packages.length}
              onClick={openTopUp}
              className="rounded-radius-sm bg-white px-3 py-1.5 text-[11px] font-semibold text-fill-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.topUpButton ?? "Top up"}
            </button>
          </div>
        </div>
      </div>

      {stripeEnabled ? (
        <p className="text-xs text-text-muted">
          {labels.walletStripeHint ??
            "Pay by card via Stripe Checkout — enter card details on the secure payment page."}
        </p>
      ) : (
        <p className="text-xs text-text-warning">
          {labels.walletManualHint ??
            "Stripe is not connected. Top-ups go to admin for approval, or connect keys under Admin → Integrations."}
        </p>
      )}

      {topUpStatus ? (
        <p className="text-sm text-text-secondary" role="status">
          {topUpStatus}
        </p>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {labels.transactionHistoryTitle ?? "Transaction history"}
          </h3>
          {compact && transactions.length > visibleTx.length ? (
            <a
              href="/student/wallet"
              className="text-xs font-medium text-text-accent hover:underline"
            >
              {labels.viewAllTransactions ?? "View all"}
            </a>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">
            {labels.loading ?? "Loading…"}
          </p>
        ) : visibleTx.length === 0 ? (
          <EmptyState
            title={labels.transactionsEmpty ?? "No transactions yet"}
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-radius border border-border bg-bg">
            {visibleTx.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {txLabel(tx)}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted">
                    {formatWhen(tx.createdAt)}
                  </p>
                </div>
                <p
                  className={
                    tx.direction === "earn"
                      ? "font-mono text-sm font-semibold text-text-success"
                      : "font-mono text-sm font-semibold text-fill-accent"
                  }
                >
                  {tx.direction === "earn" ? "+" : "−"}
                  {tx.amount.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title={labels.topUpTitle ?? "Buy credits"}
        footer={
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setTopUpOpen(false)}
            >
              {labels.close ?? "Close"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {labels.topUpIntro ??
              (stripeEnabled
                ? "Choose a pack. You’ll enter card details on Stripe’s secure checkout page — your card is charged there and credits appear after payment."
                : "Choose a pack to request a top-up. Card checkout unlocks when Stripe is connected under Admin → Integrations.")}
          </p>
          {!stripeEnabled ? (
            <p className="rounded-radius border border-border bg-bg-warning px-3 py-2 text-xs text-text-warning">
              {labels.topUpStripeRequired ??
                "Stripe is not live yet. Requests need admin approval until keys are connected."}
            </p>
          ) : null}
          {!packages.length ? (
            <EmptyState
              title={labels.topUpNoPackages ?? "No packages available"}
            />
          ) : (
            <ul className="space-y-2">
              {packages.map((pack) => (
                <li
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-radius border border-border bg-bg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {pack.label}
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      {pack.credits} {labels.walletCreditsUnit ?? "CR"} ·{" "}
                      {currencySymbol}
                      {pack.priceEur}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    type="button"
                    disabled={buyingId === pack.id}
                    onClick={() => void buyPackage(pack.id)}
                  >
                    {buyingId === pack.id
                      ? (labels.topUpBuying ?? "Starting…")
                      : stripeEnabled
                        ? (labels.topUpPayCard ?? "Pay with card")
                        : (labels.topUpAction ?? "Request")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </section>
  );
}
