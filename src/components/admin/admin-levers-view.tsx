"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgramLeversDocument, WayToEarn } from "@/types/cms";
import type { PendingRequestItem } from "@/lib/admin/dashboard";
import { AdminPromoteModal } from "@/components/admin/admin-promote-modal";
import { Button, Input } from "@/components/ui";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";

interface AdminLeversViewProps {
  labels: Record<string, string>;
}

function toPersistBody(doc: ProgramLeversDocument) {
  const { updatedAt: _updatedAt, ...rest } = doc;
  return rest;
}

export function AdminLeversView({ labels }: AdminLeversViewProps) {
  const [levers, setLevers] = useState<ProgramLeversDocument | null>(null);
  const [canPersist, setCanPersist] = useState(false);
  const [pending, setPending] = useState<PendingRequestItem[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [promoteItem, setPromoteItem] = useState<PendingRequestItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const suppressRef = useRef<(() => void) | null>(null);

  const persistLevers = useCallback(async (doc: ProgramLeversDocument) => {
    const response = await fetch("/api/admin/levers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPersistBody(doc)),
    });
    if (!response.ok) {
      setErrorCode("save_failed");
      return false;
    }
    const payload = (await response.json()) as { levers: ProgramLeversDocument };
    suppressRef.current?.();
    setLevers(payload.levers);
    setErrorCode(null);
    return true;
  }, []);

  const { status: autosaveStatus, suppressNext } = useDebouncedAutosave(
    levers,
    persistLevers,
    { enabled: canPersist, delayMs: 700 },
  );
  useEffect(() => {
    suppressRef.current = suppressNext;
  }, [suppressNext]);

  const load = async () => {
    setErrorCode(null);
    setCanPersist(false);
    try {
      const [leversRes, pendingRes, companiesRes, stagesRes] = await Promise.all([
        fetch("/api/admin/levers", { cache: "no-store" }),
        fetch("/api/admin/pending-requests", { cache: "no-store" }),
        fetch("/api/admin/crm/companies", { cache: "no-store" }),
        fetch("/api/admin/data/pipeline_stages", { cache: "no-store" }),
      ]);

      if (leversRes.ok) {
        const payload = (await leversRes.json()) as {
          levers: ProgramLeversDocument | null;
          warning?: string;
        };
        suppressNext();
        if (payload.levers) {
          setLevers(payload.levers);
          setCanPersist(!payload.warning);
          if (payload.warning) {
            setErrorCode(
              payload.warning === "levers_degraded"
                ? "load_degraded"
                : "load_failed",
            );
          }
        } else {
          setLevers(null);
          setCanPersist(false);
          setErrorCode(
            payload.warning === "levers_degraded"
              ? "load_degraded"
              : "load_failed",
          );
        }
      } else {
        setCanPersist(false);
        setErrorCode("load_failed");
        setLevers(null);
      }

      if (pendingRes.ok) {
        const payload = (await pendingRes.json()) as {
          items: PendingRequestItem[];
        };
        setPending(payload.items ?? []);
      }
      if (companiesRes.ok) {
        const payload = (await companiesRes.json()) as {
          items?: Array<{ id: string; name?: string }>;
          rows?: Array<{ id: string; name?: string }>;
        };
        const list = payload.items ?? payload.rows ?? [];
        setCompanies(
          list.map((c) => ({ id: c.id, name: c.name || c.id })),
        );
      }
      if (stagesRes.ok) {
        const payload = (await stagesRes.json()) as {
          items: Array<{ id: string; name?: string }>;
        };
        setStages(
          (payload.items ?? []).map((s) => ({
            id: s.id,
            name: s.name || s.id,
          })),
        );
      }
    } catch {
      setCanPersist(false);
      setErrorCode("load_failed");
      setLevers(null);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  const updateWay = (index: number, patch: Partial<WayToEarn>) => {
    if (!levers) return;
    const waysToEarn = [...levers.waysToEarn];
    waysToEarn[index] = { ...waysToEarn[index]!, ...patch };
    setLevers({ ...levers, waysToEarn });
  };

  const addWay = () => {
    if (!levers) return;
    setLevers({
      ...levers,
      waysToEarn: [
        ...levers.waysToEarn,
        { id: crypto.randomUUID(), action: "", credits: 0, description: "" },
      ],
    });
  };

  const removeWay = (index: number) => {
    if (!levers) return;
    setLevers({
      ...levers,
      waysToEarn: levers.waysToEarn.filter((_, rowIndex) => rowIndex !== index),
    });
  };

  const save = async () => {
    if (!levers || !canPersist) return;
    setIsSaving(true);
    setErrorCode(null);
    const ok = await persistLevers(levers);
    setIsSaving(false);
    if (!ok) setErrorCode("save_failed");
  };

  const resolvePending = async (item: PendingRequestItem, action: string) => {
    setActionError(null);
    if (item.source === "role_interest_submissions" && action === "approve") {
      setPromoteItem(item);
      return;
    }
    const response = await fetch(
      `/api/admin/pending-requests/${item.source}/${item.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setActionError(payload?.error ?? "action_failed");
      return;
    }
    await load();
  };

  if (!levers) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-text-muted">
          {errorCode
            ? labels[errorCode] ??
              labels.loadError ??
              "Could not load program levers. Refresh and try again."
            : (labels.loading ?? "Loading…")}
        </p>
        {errorCode ? (
          <Button size="sm" onClick={() => void load()}>
            {labels.retry || "Retry"}
          </Button>
        ) : null}
      </div>
    );
  }

  const summaryRows = [
    ...levers.waysToEarn.map((way) => ({
      label: way.action || way.description || "—",
      value: `${way.credits} cr`,
    })),
    {
      label: labels.placementFeeEur ?? "Placement fee (student)",
      value: `€${levers.placementFeeEur ?? 350}`,
    },
    {
      label: labels.trackAMonthly ?? "Track A",
      value: `€${levers.trackAMonthly}/mo + €${levers.trackAMatchFee} match`,
    },
    {
      label: labels.trackBMonthly ?? "Track B",
      value: `€${levers.trackBMonthly}/mo per student`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
            {labels.eyebrow ?? "Admin · Program Levers"}
          </p>
          <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
            {labels.title ?? "The economics, in one panel."}
          </h1>
          {labels.subtitle ? (
            <p className="max-w-xl text-sm text-text-secondary">{labels.subtitle}</p>
          ) : null}
          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] ??
                labels.loadError ??
                (errorCode === "load_degraded"
                  ? "Could not refresh live levers — edits are paused."
                  : errorCode === "save_failed"
                    ? "Could not save — try again."
                    : "Could not load levers.")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button disabled={isSaving || !canPersist} onClick={() => void save()}>
            {isSaving || autosaveStatus === "saving"
              ? labels.saving || "Saving…"
              : labels.save || "Save"}
          </Button>
          <p className="text-[11px] text-text-muted" aria-live="polite">
            {!canPersist
              ? labels.autosavePaused || "Autosave paused"
              : autosaveStatus === "saving"
                ? labels.saving || "Saving…"
                : autosaveStatus === "saved"
                  ? labels.saved || "Saved"
                  : autosaveStatus === "error"
                    ? labels.save_failed || "Save failed"
                    : labels.autosaveHint || "Changes save automatically"}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-radius border border-border bg-grad-card p-4">
          <h2 className="mb-3 text-[14px] font-bold text-text-primary">
            {labels.pendingTitle ?? "Pending requests"}
          </h2>
          {actionError ? (
            <p className="mb-2 text-sm text-text-warning" role="alert">
              {labels[actionError] ?? actionError}
            </p>
          ) : null}
          {pending.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {labels.pendingEmpty ?? "No requests yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((item) => (
                <li
                  key={`${item.source}-${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-radius border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-text-secondary">
                      {item.subtitle}
                      {item.createdAt
                        ? ` · ${new Date(item.createdAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-nowrap items-center gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void resolvePending(item, "approve")}
                    >
                      {item.source === "role_interest_submissions"
                        ? labels.promote || "Promote"
                        : labels.approve || "Approve"}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => void resolvePending(item, "reject")}
                    >
                      {labels.reject || "Reject"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-radius border border-border bg-grad-card p-4">
          <h2 className="mb-3 text-[14px] font-bold text-text-primary">
            {labels.summaryTitle ?? "Program levers"}
          </h2>
          <ul className="divide-y divide-border">
            {summaryRows.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
              >
                <span className="text-text-secondary">{row.label}</span>
                <span className="font-medium text-text-primary">{row.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-radius border border-border bg-grad-card p-5">
        {labels.pricingSectionTitle ? (
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-text-label">
            {labels.pricingSectionTitle}
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            id="trackAMonthly"
            type="number"
            label={labels.trackAMonthly || "Track A monthly (€)"}
            value={String(levers.trackAMonthly)}
            onChange={(event) =>
              setLevers({ ...levers, trackAMonthly: Number(event.target.value) })
            }
          />
          <Input
            id="trackAMatchFee"
            type="number"
            label={labels.trackAMatchFee || "Track A match fee (€)"}
            value={String(levers.trackAMatchFee)}
            onChange={(event) =>
              setLevers({ ...levers, trackAMatchFee: Number(event.target.value) })
            }
          />
          <Input
            id="trackBMonthly"
            type="number"
            label={labels.trackBMonthly || "Track B monthly (€)"}
            value={String(levers.trackBMonthly)}
            onChange={(event) =>
              setLevers({ ...levers, trackBMonthly: Number(event.target.value) })
            }
          />
          <Input
            id="placementFeeEur"
            type="number"
            label={labels.placementFeeEur || "Placement fee (€)"}
            value={String(levers.placementFeeEur ?? 350)}
            onChange={(event) =>
              setLevers({
                ...levers,
                placementFeeEur: Number(event.target.value),
              })
            }
          />
          <Input
            id="creditsPerEuro"
            type="number"
            label={labels.creditsPerEuro || "Credits per euro"}
            value={String(levers.creditsPerEuro ?? 4)}
            onChange={(event) =>
              setLevers({
                ...levers,
                creditsPerEuro: Number(event.target.value),
              })
            }
          />
        </div>
      </section>

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14.5px] font-bold text-text-primary">
            {labels.topUpPackagesTitle ?? "Credit top-up packages"}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLevers({
                ...levers,
                creditTopUpPackages: [
                  ...(levers.creditTopUpPackages ?? []),
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    credits: 0,
                    priceEur: 0,
                  },
                ],
              })
            }
          >
            {labels.addRow || "Add package"}
          </Button>
        </div>
        {(levers.creditTopUpPackages ?? []).map((pack, index) => (
          <div
            key={pack.id || index}
            className="grid gap-3 rounded-radius border border-border bg-bg p-4 md:grid-cols-[1.2fr_0.6fr_0.6fr_auto]"
          >
            <Input
              id={`pack-label-${index}`}
              label={labels.packageLabel ?? "Label"}
              value={pack.label}
              onChange={(event) => {
                const creditTopUpPackages = [
                  ...(levers.creditTopUpPackages ?? []),
                ];
                creditTopUpPackages[index] = {
                  ...pack,
                  label: event.target.value,
                };
                setLevers({ ...levers, creditTopUpPackages });
              }}
            />
            <Input
              id={`pack-credits-${index}`}
              type="number"
              label={labels.credits || "Credits"}
              value={String(pack.credits)}
              onChange={(event) => {
                const creditTopUpPackages = [
                  ...(levers.creditTopUpPackages ?? []),
                ];
                creditTopUpPackages[index] = {
                  ...pack,
                  credits: Number(event.target.value),
                };
                setLevers({ ...levers, creditTopUpPackages });
              }}
            />
            <Input
              id={`pack-price-${index}`}
              type="number"
              label={labels.priceEur ?? "€"}
              value={String(pack.priceEur)}
              onChange={(event) => {
                const creditTopUpPackages = [
                  ...(levers.creditTopUpPackages ?? []),
                ];
                creditTopUpPackages[index] = {
                  ...pack,
                  priceEur: Number(event.target.value),
                };
                setLevers({ ...levers, creditTopUpPackages });
              }}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="min-w-fit px-2.5"
                onClick={() =>
                  setLevers({
                    ...levers,
                    creditTopUpPackages: (
                      levers.creditTopUpPackages ?? []
                    ).filter((_, rowIndex) => rowIndex !== index),
                  })
                }
              >
                {labels.removeRow || "Remove"}
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14.5px] font-bold text-text-primary">
            {labels.waysToEarnTitle || "Ways to earn"}
          </h2>
          <Button variant="outline" size="sm" onClick={addWay}>
            {labels.addRow || "Add row"}
          </Button>
        </div>
        {levers.waysToEarn.map((way, index) => (
          <div
            key={way.id || index}
            className="grid gap-3 rounded-radius border border-border bg-bg p-4 md:grid-cols-[1.2fr_0.6fr_1.4fr_auto]"
          >
            <Input
              id={`way-action-${index}`}
              label={labels.action ?? "Action"}
              value={way.action}
              onChange={(event) =>
                updateWay(index, { action: event.target.value })
              }
            />
            <Input
              id={`way-credits-${index}`}
              type="number"
              label={labels.credits ?? "Credits"}
              value={String(way.credits)}
              onChange={(event) =>
                updateWay(index, { credits: Number(event.target.value) })
              }
            />
            <Input
              id={`way-description-${index}`}
              label={labels.description ?? "Description"}
              value={way.description}
              onChange={(event) =>
                updateWay(index, { description: event.target.value })
              }
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="min-w-fit px-2.5"
                onClick={() => removeWay(index)}
              >
                {labels.removeRow || "Remove"}
              </Button>
            </div>
          </div>
        ))}
      </section>

      <AdminPromoteModal
        open={Boolean(promoteItem)}
        item={promoteItem}
        labels={{
          ...labels,
          promoteTitle: labels.promoteTitle ?? "Promote to pipeline",
          company: labels.company ?? "Company",
          stage: labels.stage ?? "Stage",
          promote: labels.promote ?? "Promote",
          cancel: labels.cancel ?? "Cancel",
        }}
        companies={companies}
        stages={stages}
        onClose={() => setPromoteItem(null)}
        onPromoted={() => void load()}
      />
    </div>
  );
}
