"use client";

import { usePathname } from "next/navigation";
import { AdminContentNav } from "@/components/admin/admin-content-nav";

const SECTION_COPY: Record<
  string,
  { eyebrowKey: string; titleKey: string; subtitleKey: string; fallbackTitle: string }
> = {
  "/admin/content": {
    eyebrowKey: "libraryEyebrow",
    titleKey: "libraryTitle",
    subtitleKey: "librarySubtitle",
    fallbackTitle: "Content library",
  },
  "/admin/content/videos": {
    eyebrowKey: "videosEyebrow",
    titleKey: "videosTitle",
    subtitleKey: "videosSubtitle",
    fallbackTitle: "Video cards",
  },
  "/admin/content/podcast": {
    eyebrowKey: "podcastEyebrow",
    titleKey: "podcastTitle",
    subtitleKey: "podcastSubtitle",
    fallbackTitle: "Podcast episodes",
  },
  "/admin/content/testimonials": {
    eyebrowKey: "testimonialsEyebrow",
    titleKey: "testimonialsTitle",
    subtitleKey: "testimonialsSubtitle",
    fallbackTitle: "Testimonials",
  },
  "/admin/content/stories": {
    eyebrowKey: "storiesEyebrow",
    titleKey: "storiesTitle",
    subtitleKey: "storiesSubtitle",
    fallbackTitle: "Talent stories",
  },
  "/admin/content/visa-path": {
    eyebrowKey: "visaPathEyebrow",
    titleKey: "visaPathTitle",
    subtitleKey: "visaPathSubtitle",
    fallbackTitle: "Visa path simulator",
  },
  "/admin/content/marketplace": {
    eyebrowKey: "marketplaceEyebrow",
    titleKey: "marketplaceTitle",
    subtitleKey: "marketplaceSubtitle",
    fallbackTitle: "Marketplace",
  },
  "/admin/content/home": {
    eyebrowKey: "homeEyebrow",
    titleKey: "homeTitle",
    subtitleKey: "homeSubtitle",
    fallbackTitle: "Homepage",
  },
  "/admin/content/about": {
    eyebrowKey: "aboutEyebrow",
    titleKey: "aboutTitle",
    subtitleKey: "aboutSubtitle",
    fallbackTitle: "About page",
  },
  "/admin/content/careers": {
    eyebrowKey: "careersEyebrow",
    titleKey: "careersTitle",
    subtitleKey: "careersSubtitle",
    fallbackTitle: "Careers",
  },
  "/admin/content/roles": {
    eyebrowKey: "rolesEyebrow",
    titleKey: "rolesTitle",
    subtitleKey: "rolesSubtitle",
    fallbackTitle: "Browse roles",
  },
  "/admin/content/journal": {
    eyebrowKey: "journalEyebrow",
    titleKey: "journalTitle",
    subtitleKey: "journalSubtitle",
    fallbackTitle: "Journal",
  },
  "/admin/content/how-it-works": {
    eyebrowKey: "howItWorksEyebrow",
    titleKey: "howItWorksTitle",
    subtitleKey: "howItWorksSubtitle",
    fallbackTitle: "How it works",
  },
  "/admin/content/pricing": {
    eyebrowKey: "pricingEyebrow",
    titleKey: "pricingTitle",
    subtitleKey: "pricingSubtitle",
    fallbackTitle: "Pricing copy",
  },
  "/admin/content/tracks": {
    eyebrowKey: "tracksEyebrow",
    titleKey: "tracksTitle",
    subtitleKey: "tracksSubtitle",
    fallbackTitle: "Tracks copy",
  },
  "/admin/content/pages": {
    eyebrowKey: "pagesEyebrow",
    titleKey: "pagesTitle",
    subtitleKey: "pagesSubtitle",
    fallbackTitle: "Custom pages",
  },
  "/admin/content/forms": {
    eyebrowKey: "formsEyebrow",
    titleKey: "formsTitle",
    subtitleKey: "formsSubtitle",
    fallbackTitle: "Custom forms",
  },
};

export function AdminContentShell({
  labels,
  children,
}: {
  labels: Record<string, string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const section = SECTION_COPY[pathname] ?? {
    eyebrowKey: "eyebrow",
    titleKey: "title",
    subtitleKey: "subtitle",
    fallbackTitle: "Content",
  };

  const eyebrow =
    labels[section.eyebrowKey] ||
    labels.eyebrow ||
    (pathname === "/admin/content" ? "Content" : "Homepage content");
  const title =
    labels[section.titleKey] ||
    labels[section.titleKey.replace(/Title$/, "")] ||
    labels.title ||
    section.fallbackTitle;
  const subtitle = labels[section.subtitleKey] || labels.subtitle || "";

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <header className="mb-4 space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {eyebrow}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3.2vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </header>
      <AdminContentNav labels={labels} />
      {children}
    </div>
  );
}
