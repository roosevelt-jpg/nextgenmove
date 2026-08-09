"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";

export default function SponsorPortalPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.token;
    if (!token) return;
    void (async () => {
      const res = await fetch(`/api/sponsor/${token}`, { cache: "no-store" });
      if (!res.ok) {
        setError("This sponsor link is invalid or revoked.");
        return;
      }
      setData((await res.json()) as Record<string, unknown>);
    })();
  }, [params?.token]);

  if (error) {
    return (
      <main className="page-container py-16">
        <p className="text-sm text-text-warning">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-container py-16">
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  const student = (data.student ?? {}) as Record<string, unknown>;
  const evidence = (data.evidence ?? []) as Array<Record<string, unknown>>;
  const move = data.move as Record<string, unknown> | null;
  const milestones = (move?.milestones ?? []) as Array<Record<string, unknown>>;
  const token = params?.token;

  return (
    <main className="page-container space-y-6 py-12">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          Sponsor trust portal
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          Hello {String(data.sponsorName ?? "Sponsor")}
        </h1>
        <p className="text-sm text-text-secondary">
          Read-only view of {String(student.displayName ?? "talent")}’s Dubai-ready
          progress. Employer deal terms are never shown here.
        </p>
        {token ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                window.open(
                  `/api/sponsor/${token}/report`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              Download / Print progress
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => window.print()}
            >
              Print this page
            </Button>
          </div>
        ) : null}
      </header>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <p className="text-sm text-text-secondary">Dubai-Ready score</p>
        <p className="font-serif text-4xl text-text-primary">
          {Number(student.dubaiReadyScore ?? 0)}
        </p>
        <p className="text-sm text-text-secondary">
          Bench status: {String(student.benchStatus ?? "not_ready")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl">Evidence pack</h2>
        {evidence.map((item, index) => (
          <div
            key={`${String(item.kind)}-${index}`}
            className="flex justify-between rounded-radius border border-border px-3 py-2 text-sm"
          >
            <span>{String(item.label ?? item.kind)}</span>
            <span className="text-text-muted">{String(item.status)}</span>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl">Move itinerary</h2>
        {!move ? (
          <p className="text-sm text-text-muted">No active move yet.</p>
        ) : (
          milestones.map((m) => (
            <div
              key={String(m.key)}
              className="flex justify-between rounded-radius border border-border px-3 py-2 text-sm"
            >
              <span>{String(m.label)}</span>
              <span className="text-text-muted">{String(m.status)}</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
