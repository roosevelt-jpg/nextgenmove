"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export type AuthPanel = "signIn" | "signUpTalent" | "signUpCompany";

export interface AuthSplitShellProps {
  labels: Record<string, string | undefined>;
  siteName: string;
  brandMark: string;
  logoUrl?: string | null;
  panel?: AuthPanel;
  children: React.ReactNode;
}

export function AuthSplitShell({
  labels,
  siteName,
  brandMark: _brandMark,
  logoUrl: _logoUrl,
  panel = "signIn",
  children,
}: AuthSplitShellProps) {
  const name = siteName || "Nextgenmove";

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
        <Link
          href="/"
          className="relative z-10 inline-flex items-center"
          aria-label={name}
        >
          <BrandLogo size="auth" tone="onDark" alt={name} priority />
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

      <div className="flex w-full flex-col items-center justify-center bg-[#F8FAFC] px-5 py-8 text-text-primary sm:px-8 lg:w-1/2 lg:px-12 xl:px-16 dark:bg-surface-1">
        <div className="w-full max-w-[22.5rem]">
          {/* Brand mark centered above the form heading (sign-in / sign-up). */}
          <Link
            href="/"
            className="mb-7 flex w-full justify-center sm:mb-8"
            aria-label={name}
          >
            <BrandLogo size="auth" tone="color" alt={name} priority />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
