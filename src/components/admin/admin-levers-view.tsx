"use client";

import { useEffect, useState } from "react";
import type { ProgramLeversDocument, WayToEarn } from "@/types/cms";
import { Button, Input } from "@/components/ui";

interface AdminLeversViewProps {
  labels: Record<string, string>;
}

export function AdminLeversView({ labels }: AdminLeversViewProps) {
  const [levers, setLevers] = useState<ProgramLeversDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/levers");
    if (response.ok) {
      const payload = (await response.json()) as { levers: ProgramLeversDocument | null };
      setLevers(payload.levers);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateWay = (index: number, patch: Partial<WayToEarn>) => {
    if (!levers) {
      return;
    }

    const waysToEarn = [...levers.waysToEarn];
    waysToEarn[index] = { ...waysToEarn[index]!, ...patch };
    setLevers({ ...levers, waysToEarn });
  };

  const addWay = () => {
    if (!levers) {
      return;
    }

    setLevers({
      ...levers,
      waysToEarn: [
        ...levers.waysToEarn,
        { id: crypto.randomUUID(), action: "", credits: 0, description: "" },
      ],
    });
  };

  const removeWay = (index: number) => {
    if (!levers) {
      return;
    }

    setLevers({
      ...levers,
      waysToEarn: levers.waysToEarn.filter((_, rowIndex) => rowIndex !== index),
    });
  };

  const save = async () => {
    if (!levers) {
      return;
    }

    setIsSaving(true);
    setErrorCode(null);

    const response = await fetch("/api/admin/levers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(levers),
    });

    setIsSaving(false);

    if (!response.ok) {
      setErrorCode("save_failed");
      return;
    }

    const payload = (await response.json()) as { levers: ProgramLeversDocument };
    setLevers(payload.levers);
  };

  if (!levers) {
    return <p className="text-sm text-text-muted">{labels.loading}</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
        <Button disabled={isSaving} onClick={save}>
          {labels.save}
        </Button>
      </header>

      <section className="rounded-radius border border-border bg-surface-1 p-5">
        {labels.pricingSectionTitle ? (
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-text-label">
            {labels.pricingSectionTitle}
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1 rounded-radius border border-border bg-bg px-4 py-3">
            <Input
              id="trackAMonthly"
              type="number"
              label={labels.trackAMonthly}
              value={String(levers.trackAMonthly)}
              onChange={(event) =>
                setLevers({ ...levers, trackAMonthly: Number(event.target.value) })
              }
            />
          </div>
          <div className="space-y-1 rounded-radius border border-border bg-bg px-4 py-3">
            <Input
              id="trackAMatchFee"
              type="number"
              label={labels.trackAMatchFee}
              value={String(levers.trackAMatchFee)}
              onChange={(event) =>
                setLevers({ ...levers, trackAMatchFee: Number(event.target.value) })
              }
            />
          </div>
          <div className="space-y-1 rounded-radius border border-fill-accent bg-brand-lavender px-4 py-3">
            <Input
              id="trackBMonthly"
              type="number"
              label={labels.trackBMonthly}
              value={String(levers.trackBMonthly)}
              onChange={(event) =>
                setLevers({ ...levers, trackBMonthly: Number(event.target.value) })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-radius border border-border bg-surface-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-text-primary">{labels.waysToEarnTitle}</h2>
          <Button variant="outline" size="sm" onClick={addWay}>
            {labels.addRow}
          </Button>
        </div>

        {levers.waysToEarn.map((way, index) => (
          <div
            key={way.id || index}
            className="grid gap-3 rounded-radius border border-border bg-bg p-4 md:grid-cols-[1.2fr_0.6fr_1.4fr_auto]"
          >
            <Input
              id={`way-action-${index}`}
              label={labels.action}
              value={way.action}
              onChange={(event) => updateWay(index, { action: event.target.value })}
            />
            <Input
              id={`way-credits-${index}`}
              type="number"
              label={labels.credits}
              value={String(way.credits)}
              onChange={(event) =>
                updateWay(index, { credits: Number(event.target.value) })
              }
            />
            <Input
              id={`way-description-${index}`}
              label={labels.description}
              value={way.description}
              onChange={(event) => updateWay(index, { description: event.target.value })}
            />
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => removeWay(index)}>
                {labels.removeRow}
              </Button>
            </div>
          </div>
        ))}
      </section>

      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? errorCode}
        </p>
      ) : null}
    </div>
  );
}
