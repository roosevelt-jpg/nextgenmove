"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import type { AdminDashboardStats } from "@/lib/admin/dashboard";
import { cn } from "@/lib/utils";

interface ContentRow {
  id: string;
  title: string;
  category: string;
  costCredits: number;
  priceEur?: number;
  status: "draft" | "live" | "archived";
}

interface AdminDashboardViewProps {
  labels: Record<string, string>;
  initialStats: AdminDashboardStats;
}

function PlacementsChart({
  labels,
  monthLabels,
  active,
  placed,
}: {
  labels: Record<string, string>;
  monthLabels: string[];
  active: number[];
  placed: number[];
}) {
  const max = Math.max(1, ...active, ...placed);
  const w = 420;
  const h = 180;
  const pad = { t: 16, r: 12, b: 28, l: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const barW = innerW / Math.max(active.length, 1) / 2.2;

  const points = placed
    .map((v, i) => {
      const x =
        pad.l +
        (i + 0.5) * (innerW / Math.max(placed.length, 1));
      const y = pad.t + innerH - (v / max) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-radius border border-border bg-surface-1 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-text-primary">
          {labels.chartPlacementsTitle ??
            "Placements & active students, last 6 months"}
        </h2>
        <div className="flex gap-3 text-[11px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-fill-accent" />
            {labels.chartActiveStudents ?? "Active students"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-text-accent" />
            {labels.chartPlaced ?? "Placed"}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--text-muted)"
              >
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        {active.map((v, i) => {
          const x =
            pad.l +
            (i + 0.5) * (innerW / active.length) -
            barW / 2;
          const barH = (v / max) * innerH;
          const y = pad.t + innerH - barH;
          return (
            <rect
              key={`b-${i}`}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill="var(--fill-accent)"
              opacity="0.9"
            />
          );
        })}
        <polyline
          points={points}
          fill="none"
          stroke="var(--text-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {placed.map((v, i) => {
          const x =
            pad.l + (i + 0.5) * (innerW / placed.length);
          const y = pad.t + innerH - (v / max) * innerH;
          return (
            <circle
              key={`p-${i}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="var(--text-accent)"
            />
          );
        })}
        {monthLabels.map((label, i) => {
          const x = pad.l + (i + 0.5) * (innerW / monthLabels.length);
          return (
            <text
              key={label}
              x={x}
              y={h - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function TrackDonut({
  labels,
  trackA,
  trackB,
}: {
  labels: Record<string, string>;
  trackA: number;
  trackB: number;
}) {
  const total = Math.max(trackA + trackB, 1);
  const aPct = Math.round((trackA / total) * 100);
  const bPct = 100 - aPct;
  const r = 54;
  const c = 2 * Math.PI * r;
  const aLen = (aPct / 100) * c;

  return (
    <div className="rounded-radius border border-border bg-surface-1 p-4">
      <h2 className="mb-3 text-[14px] font-semibold text-text-primary">
        {labels.chartTracksTitle ?? "Track A vs Track B"}
      </h2>
      <div className="flex items-center justify-center gap-6">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth="14"
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="var(--fill-accent)"
              strokeWidth="14"
              strokeDasharray={`${aLen} ${c - aLen}`}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="var(--text-accent)"
              strokeWidth="14"
              strokeDasharray={`${(bPct / 100) * c} ${c}`}
              strokeDashoffset={-aLen}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-xl font-semibold text-text-primary">
              {trackA + trackB}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-wide text-text-muted">
              {labels.chartCompanies ?? "Companies"}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-[12px]">
          <p className="flex items-center gap-2 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-sm bg-fill-accent" />
            {labels.trackALabel ?? "Track A"} · {aPct}%
          </p>
          <p className="flex items-center gap-2 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-sm bg-text-accent" />
            {labels.trackBLabel ?? "Track B"} · {bPct}%
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardView({
  labels,
  initialStats,
}: AdminDashboardViewProps) {
  const [stats, setStats] = useState(initialStats);
  const [content, setContent] = useState<ContentRow[]>([]);

  const refresh = useCallback(async () => {
    const [statsRes, contentRes] = await Promise.all([
      fetch("/api/admin/dashboard/stats"),
      fetch("/api/admin/data/content_items"),
    ]);
    if (statsRes.ok) {
      const payload = (await statsRes.json()) as { stats: AdminDashboardStats };
      setStats(payload.stats);
    }
    if (contentRes.ok) {
      const payload = (await contentRes.json()) as {
        items: Array<Record<string, unknown>>;
      };
      setContent(
        payload.items.map((item) => ({
          id: String(item.id ?? ""),
          title: String(item.title ?? ""),
          category: String(item.category ?? ""),
          costCredits: Number(item.costCredits ?? 0),
          priceEur:
            item.priceEur == null ? undefined : Number(item.priceEur),
          status: (String(item.status ?? "draft") as ContentRow["status"]),
        })),
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 20000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const heroStats = useMemo(
    () => [
      {
        key: "activeStudents",
        value: stats.activeStudents,
        tone: "text-fill-accent",
      },
      {
        key: "pendingRequestsCount",
        value: stats.pendingRequestsCount,
        tone: "text-text-accent",
      },
      {
        key: "placedThisQuarter",
        value: stats.placedThisQuarter,
        tone: "text-text-success",
      },
      {
        key: "avgTimeToPlaceDays",
        value:
          stats.avgTimeToPlaceDays == null
            ? "—"
            : `${stats.avgTimeToPlaceDays}${labels.daysSuffix ?? "d"}`,
        tone: "text-text-success",
      },
    ],
    [stats, labels.daysSuffix],
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow ?? "Admin"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {labels.title ?? "Operations dashboard."}
        </h1>
        {labels.subtitle ? (
          <p className="max-w-xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {heroStats.map((card) =>
          labels[card.key] ? (
            <div
              key={card.key}
              className="rounded-radius border border-border bg-surface-1 px-4 py-3.5"
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {labels[card.key]}
              </p>
              <p
                className={cn(
                  "mt-1 font-serif text-[1.65rem] font-semibold leading-none",
                  card.tone,
                )}
              >
                {card.value}
              </p>
            </div>
          ) : null,
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <PlacementsChart
          labels={labels}
          monthLabels={stats.monthLabels}
          active={stats.monthlyActiveStudents}
          placed={stats.monthlyPlaced}
        />
        <TrackDonut
          labels={labels}
          trackA={stats.trackACompanies}
          trackB={stats.trackBCompanies}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14.5px] font-bold text-text-primary">
            {labels.contentLibraryTitle ?? "Content library"}
          </h2>
          <Link href="/admin/content">
            <Button variant="primary" size="sm">
              {labels.uploadMaterial ?? "+ Upload material"}
            </Button>
          </Link>
        </div>

        {content.length === 0 ? (
          <div className="rounded-radius border border-border bg-surface-1 px-4 py-10 text-center text-sm text-text-muted">
            {labels.contentEmpty ?? "No content items yet."}
          </div>
        ) : (
          <ul className="space-y-2">
            {content.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-radius border border-border bg-surface-1 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-text-primary">
                    {item.title}
                  </p>
                  <p className="text-[12px] text-text-secondary">
                    {item.category}
                    {item.costCredits
                      ? ` · ${item.costCredits} credits`
                      : ""}
                    {item.priceEur != null ? ` (€${item.priceEur})` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(["draft", "live", "archived"] as const).map((status) => {
                    const active = item.status === status;
                    return (
                      <span
                        key={status}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
                          active && status === "live"
                            ? "bg-bg-success text-text-success"
                            : active && status === "draft"
                              ? "bg-bg-accent text-text-accent"
                              : "bg-surface-2 text-text-secondary",
                        )}
                      >
                        {labels[`status_${status}`] ?? status}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
