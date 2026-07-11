"use client";

import Link from "next/link";

export type AuthPanel = "signIn" | "signUpTalent" | "signUpCompany";

export interface AuthSplitShellProps {
  labels: Record<string, string>;
  siteName: string;
  brandMark: string;
  panel?: AuthPanel;
  children: React.ReactNode;
}

export function AuthSplitShell({
  labels,
  siteName,
  brandMark,
  panel = "signIn",
  children,
}: AuthSplitShellProps) {
  const name = siteName || "Venturo";
  const mark = brandMark || "V";

  const quote =
    panel === "signUpCompany"
      ? labels.panelQuoteCompany ??
        labels.panelQuote ??
        "We moved from Track A to Track B once we needed three hires in a single quarter — sourcing alone cut our time-to-place in half."
      : labels.panelQuote ??
        "Six weeks ago I was refreshing job boards in Amsterdam. Today I'm running brand for a scale-up in Dubai.";

  const attribution =
    panel === "signUpCompany"
      ? labels.panelAttributionCompany ??
        labels.panelAttribution ??
        "Nordbridge Logistics · Track B · 3 placements in Q2"
      : labels.panelAttribution ??
        `Sara K. · Marketing Lead · Placed via ${name}`;

  const stats =
    panel === "signUpCompany"
      ? [
          {
            value: labels.statCompaniesValue ?? "37",
            label: labels.statCompaniesLabel ?? "Companies hiring",
          },
          {
            value: labels.statMatchValue ?? "94%",
            label: labels.statMatchLabel ?? "Top match score",
          },
          {
            value: labels.statCorridorsValue ?? "6",
            label: labels.statCorridorsLabel ?? "Live corridors",
          },
        ]
      : [
          {
            value: labels.statStudentsValue ?? "248",
            label: labels.statStudentsLabel ?? "Active students",
          },
          {
            value: labels.statPlacedValue ?? "41",
            label: labels.statPlacedLabel ?? "Placed this Q",
          },
          {
            value: labels.statTimeValue ?? "38d",
            label: labels.statTimeLabel ?? "Avg. time to place",
          },
        ];

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[image:var(--grad-horizon)] p-10 text-white lg:flex">
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-radius-sm bg-white/20 text-[12px] font-bold tracking-tight">
            {mark}
          </span>
          <span className="font-serif text-[1.125rem] font-semibold">{name}</span>
        </Link>

        <blockquote className="relative z-10 max-w-md">
          <p className="font-serif text-[clamp(1.35rem,2.4vw,1.85rem)] font-medium italic leading-snug text-white/95">
            “{quote}”
          </p>
          <footer className="mt-4 text-[13px] text-white/80">{attribution}</footer>
        </blockquote>

        <dl className="relative z-10 grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-serif text-2xl font-semibold">{stat.value}</dt>
              <dd className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-[420px]">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:mb-10">
            <span className="flex h-8 w-8 items-center justify-center rounded-radius-sm bg-bg-purple text-[12px] font-bold text-fill-accent">
              {mark}
            </span>
            <span className="font-serif text-[1.125rem] font-semibold text-text-primary">
              {name}
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
