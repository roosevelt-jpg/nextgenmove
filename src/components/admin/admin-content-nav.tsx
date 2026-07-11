"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const CONTENT_SECTIONS = [
  { key: "library", href: "/admin/content" },
  { key: "videos", href: "/admin/content/videos" },
  { key: "podcast", href: "/admin/content/podcast" },
  { key: "home", href: "/admin/content/home" },
  { key: "about", href: "/admin/content/about" },
  { key: "careers", href: "/admin/content/careers" },
  { key: "roles", href: "/admin/content/roles" },
  { key: "journal", href: "/admin/content/journal" },
  { key: "howItWorks", href: "/admin/content/how-it-works" },
  { key: "pricing", href: "/admin/content/pricing" },
  { key: "tracks", href: "/admin/content/tracks" },
  { key: "pages", href: "/admin/content/pages" },
  { key: "forms", href: "/admin/content/forms" },
] as const;

export function AdminContentNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Homepage content">
      {CONTENT_SECTIONS.map((section) => {
        const label = labels[section.key];
        if (!label) {
          return null;
        }

        const isActive =
          section.href === "/admin/content"
            ? pathname === "/admin/content"
            : pathname === section.href;

        return (
          <Link
            key={section.key}
            href={section.href}
            className={cn(
              "inline-flex min-h-[30px] items-center rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              isActive
                ? "bg-fill-primary text-on-primary"
                : "bg-surface-2 text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
