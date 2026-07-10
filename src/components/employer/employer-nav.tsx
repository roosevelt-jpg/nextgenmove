"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface EmployerNavLabels {
  talentPool?: string;
  pipeline?: string;
  shortlist?: string;
  profile?: string;
  settings?: string;
}

const NAV_ITEMS = [
  { key: "talentPool" as const, href: "/employer/talent-pool" },
  { key: "pipeline" as const, href: "/employer/pipeline" },
  { key: "shortlist" as const, href: "/employer/shortlist" },
  { key: "profile" as const, href: "/employer/profile" },
];

export function EmployerNav({ labels }: { labels: EmployerNavLabels }) {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex flex-wrap gap-6 text-sm" aria-label="employer">
      {NAV_ITEMS.map((item) => {
        const label = labels[item.key];
        if (!label) {
          return null;
        }

        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "pb-2 text-text-secondary transition-colors hover:text-text-primary",
              isActive && "border-b-2 border-text-primary font-medium text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
      {labels.settings ? (
        <Link
          href="/employer/settings"
          className={cn(
            "pb-2 text-text-secondary transition-colors hover:text-text-primary",
            pathname === "/employer/settings" &&
              "border-b-2 border-text-primary font-medium text-text-primary",
          )}
        >
          {labels.settings}
        </Link>
      ) : null}
    </nav>
  );
}
