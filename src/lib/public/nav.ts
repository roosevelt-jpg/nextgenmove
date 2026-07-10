import type { FooterGroup, NavLabels } from "@/types/cms";

export const PUBLIC_ROUTES = {
  about: "/about",
  careers: "/careers",
  journal: "/journal",
  browseRoles: "/careers-talent",
  howItWorks: "/how-it-works",
  credits: "/credits",
  pricing: "/pricing",
  tracks: "/tracks",
  requestTalent: "/request-talent",
} as const;

export function buildDefaultFooterGroups(navLabels: NavLabels = {}): FooterGroup[] {
  return [
    {
      key: "company",
      label: navLabels.companySection,
      links: [
        { key: "about", href: PUBLIC_ROUTES.about, label: navLabels.about },
        { key: "careers", href: PUBLIC_ROUTES.careers, label: navLabels.careers },
        { key: "journal", href: PUBLIC_ROUTES.journal, label: navLabels.journal },
      ],
    },
    {
      key: "talent",
      label: navLabels.talentSection,
      links: [
        {
          key: "browseRoles",
          href: PUBLIC_ROUTES.browseRoles,
          label: navLabels.browseRoles,
        },
        {
          key: "howItWorks",
          href: PUBLIC_ROUTES.howItWorks,
          label: navLabels.howItWorks,
        },
        { key: "credits", href: PUBLIC_ROUTES.credits, label: navLabels.credits },
      ],
    },
    {
      key: "employers",
      label: navLabels.employersSection,
      links: [
        { key: "pricing", href: PUBLIC_ROUTES.pricing, label: navLabels.pricing },
        { key: "tracks", href: PUBLIC_ROUTES.tracks, label: navLabels.tracks },
        {
          key: "requestTalent",
          href: PUBLIC_ROUTES.requestTalent,
          label: navLabels.requestTalent,
        },
      ],
    },
  ];
}

export function resolveFooterGroups(
  footerLinks: FooterGroup[] | undefined,
  navLabels: NavLabels,
): FooterGroup[] {
  if (footerLinks?.length) {
    return footerLinks;
  }

  return buildDefaultFooterGroups(navLabels);
}

export function buildHeaderSections(navLabels: NavLabels = {}) {
  return buildDefaultFooterGroups(navLabels);
}

/** Flat primary nav links matching the marketing mockup header. */
export function buildHeaderPrimaryLinks(navLabels: NavLabels = {}) {
  return [
    {
      key: "howItWorks",
      href: PUBLIC_ROUTES.howItWorks,
      label: navLabels.howItWorks,
    },
    {
      key: "forCompanies",
      href: PUBLIC_ROUTES.tracks,
      label: navLabels.forCompanies,
    },
    {
      key: "pricing",
      href: PUBLIC_ROUTES.pricing,
      label: navLabels.pricing,
    },
    {
      key: "signIn",
      href: "/sign-in",
      label: navLabels.signIn,
    },
  ] as const;
}
