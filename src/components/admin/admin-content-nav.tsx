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
              "inline-flex min-h-7 items-center rounded-full bg-grad-rouse px-2.5 py-1 text-[11px] font-semibold text-on-gradient transition-opacity",
              isActive
                ? "opacity-100 shadow-sm ring-2 ring-white/35"
                : "opacity-70 hover:opacity-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
