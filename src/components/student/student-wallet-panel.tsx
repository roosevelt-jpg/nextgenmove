"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Modal } from "@/components/ui";

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

export function StudentWalletPanel({
  labels,
  compact = false,
  historyLimit = 50,
}: StudentWalletPanelProps) {
  const [credits, setCredits] = useState(0);
  const [packages, setPackages] = useState<TopUpPackage[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpStatus, setTopUpStatus] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

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
    };
    setCredits(data.credits);
    setPackages(data.packages ?? []);
    setStripeEnabled(Boolean(data.stripeEnabled));
    setTransactions(data.transactions ?? []);
  }, [historyLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topup = params.get("topup");
    if (topup === "success") {
      setTopUpStatus(labels.topUpSuccess ?? "Top-up successful. Balance updated.");
      void load();
    } else if (topup === "cancelled") {
      setTopUpStatus(labels.topUpCancelled ?? "Top-up cancelled.");
    }
  }, [labels.topUpSuccess, labels.topUpCancelled, load]);

  const buyPackage = async (packageId: string) => {
    setBuyingId(packageId);
    setTopUpStatus(null);
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
      setTopUpStatus(labels.topUpFailed ?? "Could not start top-up. Try again.");
      return;
    }
    const payload = (await response.json()) as {
      mode?: string;
      url?: string;
    };
    if (payload.mode === "stripe" && payload.url) {
      window.location.href = payload.url;
      return;
    }
    setTopUpStatus(
      labels.topUpRequested ?? "Request sent — pending admin approval.",
    );
    setTopUpOpen(false);
    await load();
  };

  const visibleTx = compact ? transactions.slice(0, 8) : transactions;

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
          onClick={() => {
            setTopUpStatus(null);
            setTopUpOpen(true);
          }}
        >
          {labels.topUpButton ?? "Top up"}
        </Button>
      </div>

      <div className="rounded-radius border border-border bg-bg px-4 py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          {labels.creditsLabel ?? "Credit balance"}
        </p>
        <p className="mt-1 font-serif text-[2rem] font-semibold text-fill-accent">
          {loading ? "…" : credits.toLocaleString()}
        </p>
        {stripeEnabled ? (
          <p className="mt-1 text-xs text-text-muted">
            {labels.walletStripeHint ?? "Card checkout available for top-ups."}
          </p>
        ) : (
          <p className="mt-1 text-xs text-text-muted">
            {labels.walletManualHint ??
              "Top-ups are requested for admin approval until Stripe is connected."}
          </p>
        )}
      </div>

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
          {labels.topUpIntro ? (
            <p className="text-sm text-text-secondary">{labels.topUpIntro}</p>
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
                      {pack.credits} cr · €{pack.priceEur}
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
                      : (labels.topUpAction ?? "Buy")}
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
