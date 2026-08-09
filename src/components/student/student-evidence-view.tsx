"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  EVIDENCE_KINDS,
  type EvidenceItem,
  type EvidenceKind,
  type StudentReadiness,
} from "@/types/move-os";

type PriorVersion = {
  id: string;
  kind: EvidenceKind;
  label: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  verifiedAt?: string | null;
};

export function StudentEvidenceView() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [supersededByKind, setSupersededByKind] = useState<
    Partial<Record<EvidenceKind, PriorVersion[]>>
  >({});
  const [readiness, setReadiness] = useState<StudentReadiness | null>(null);
  const [kind, setKind] = useState<(typeof EVIDENCE_KINDS)[number]>("passport");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/student/evidence", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      items: EvidenceItem[];
      readiness: StudentReadiness;
      supersededByKind?: Partial<Record<EvidenceKind, PriorVersion[]>>;
    };
    setItems(payload.items ?? []);
    setReadiness(payload.readiness ?? null);
    setSupersededByKind(payload.supersededByKind ?? {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "document");
      const uploadRes = await fetch("/api/student/upload", {
        method: "POST",
        body: form,
      });
      const uploadPayload = (await uploadRes.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        path?: string;
        filename?: string;
        size?: number | null;
        mimeType?: string;
        uploadedAt?: string | null;
      };
      if (!uploadRes.ok || !uploadPayload.url || !uploadPayload.path) {
        setMessage(uploadPayload.error || "Upload failed.");
        return;
      }
      const createRes = await fetch("/api/student/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          label: label.trim() || kind.replaceAll("_", " "),
          expiresAt: expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
          file: {
            url: uploadPayload.url,
            path: uploadPayload.path,
            filename: uploadPayload.filename || file.name,
            size: uploadPayload.size ?? file.size,
            mimeType: uploadPayload.mimeType || file.type,
            uploadedAt: uploadPayload.uploadedAt ?? new Date().toISOString(),
          },
        }),
      });
      if (!createRes.ok) {
        setMessage("Could not save evidence.");
        return;
      }
      setLabel("");
      setExpiresAt("");
      await load();
      setMessage("Evidence submitted for verification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          Dubai-Ready Vault
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          Evidence that unlocks the bench.
        </h1>
        <p className="text-sm text-text-secondary">
          Upload verifiable artifacts. Admin verifies them. Your Dubai-Ready
          score and Visa-Cleared Bench status update automatically.
        </p>
      </header>

      {readiness ? (
        <section className="rounded-radius border border-border bg-grad-card p-4">
          <p className="text-sm text-text-secondary">Dubai-Ready score</p>
          <p className="font-serif text-4xl text-text-primary">{readiness.score}</p>
          <p className="mt-1 text-sm text-text-secondary">
            Bench: <span className="font-medium text-text-primary">{readiness.benchStatus}</span>
          </p>
          {readiness.missingKinds.length ? (
            <p className="mt-2 text-xs text-text-muted">
              Missing: {readiness.missingKinds.join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3 rounded-radius border border-border bg-surface-1 p-4">
        <label className="block space-y-1 text-sm">
          <span className="text-text-label">Evidence kind</span>
          <select
            className="w-full rounded-radius-sm border border-border bg-surface-1 px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            {EVIDENCE_KINDS.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-text-label">Label</span>
          <input
            className="w-full rounded-radius-sm border border-border bg-surface-1 px-3 py-2"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Passport bio page"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-text-label">Expires (optional)</span>
          <input
            type="date"
            className="w-full rounded-radius-sm border border-border bg-surface-1 px-3 py-2"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <input
          type="file"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">Your vault</h2>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">No evidence uploaded yet.</p>
        ) : (
          items
            .filter((item) => item.status !== "superseded")
            .map((item) => {
              const priors = (supersededByKind[item.kind] ?? []).filter(
                (prior) => prior.id !== item.id,
              );
              return (
                <div
                  key={item.id}
                  className="space-y-1 rounded-radius border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-muted">
                        {item.kind} · {item.status}
                        {item.expiresAt
                          ? ` · expires ${new Date(item.expiresAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    {item.file?.url ? (
                      <a
                        className="link-brand text-xs"
                        href={item.file.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                  {priors.length > 0 ? (
                    <details className="text-xs text-text-muted">
                      <summary className="cursor-pointer">
                        {priors.length} prior version
                        {priors.length === 1 ? "" : "s"}
                      </summary>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {priors.map((prior) => (
                          <li key={prior.id}>
                            {prior.label} · superseded
                            {prior.createdAt
                              ? ` · ${new Date(prior.createdAt).toLocaleDateString()}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              );
            })
        )}
      </section>
    </div>
  );
}
