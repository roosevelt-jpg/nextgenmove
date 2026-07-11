"use client";

import { usePathname } from "next/navigation";
import { AdminContentNav } from "@/components/admin/admin-content-nav";

export function AdminContentShell({
  labels,
  children,
}: {
  labels: Record<string, string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLibrary = pathname === "/admin/content";

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      {isLibrary ? (
        <header className="mb-4 space-y-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
            {labels.libraryEyebrow ?? "Admin"}
          </p>
          <h1 className="font-serif text-[clamp(1.5rem,3.2vw,2.125rem)] font-semibold leading-tight text-text-primary">
            {labels.libraryTitle ?? labels.library ?? "Content library"}
          </h1>
          {labels.librarySubtitle ? (
            <p className="max-w-2xl text-sm text-text-secondary">
              {labels.librarySubtitle}
            </p>
          ) : null}
        </header>
      ) : (
        <header className="mb-4 space-y-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
            {labels.eyebrow ?? "Admin · Homepage Content"}
          </p>
          <h1 className="font-serif text-[clamp(1.5rem,3.2vw,2.125rem)] font-semibold leading-tight text-text-primary">
            {labels.title ?? "Video cards & podcast episodes."}
          </h1>
          {labels.subtitle ? (
            <p className="max-w-2xl text-sm text-text-secondary">{labels.subtitle}</p>
          ) : null}
        </header>
      )}
      <AdminContentNav labels={labels} />
      {children}
    </div>
  );
}
