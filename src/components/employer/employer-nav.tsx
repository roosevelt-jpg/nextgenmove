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

const linkClass =
  "-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent pb-3 text-text-secondary transition-colors hover:text-text-primary";

export function EmployerNav({ labels }: { labels: EmployerNavLabels }) {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex gap-4 overflow-x-auto border-b border-border text-sm sm:gap-6"
      aria-label="employer"
    >
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
              linkClass,
              isActive && "border-fill-primary font-bold text-text-primary",
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
            linkClass,
            pathname === "/employer/settings" &&
              "border-fill-primary font-bold text-text-primary",
          )}
        >
          {labels.settings}
        </Link>
      ) : null}
    </nav>
  );
}
