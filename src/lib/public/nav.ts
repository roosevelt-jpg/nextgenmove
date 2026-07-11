import type { CmsPageDocument, FooterGroup, NavLabels } from "@/types/cms";

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
  cmsPages: CmsPageDocument[] = [],
): FooterGroup[] {
  const base = footerLinks?.length
    ? footerLinks.map((group) => ({
        ...group,
        links: [...(group.links ?? [])],
      }))
    : buildDefaultFooterGroups(navLabels);

  for (const page of cmsPages) {
    const groupKey = page.footerGroup;
    if (!groupKey || groupKey === "none") continue;
    const group = base.find((item) => item.key === groupKey);
    if (!group) continue;
    const href = `/pages/${page.slug}`;
    const already = group.links.some((link) => link.href === href);
    if (already) continue;
    group.links.push({
      key: `cms-${page.slug}`,
      href,
      label: page.navLabel || page.title,
    });
  }

  return base;
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

export function isCmsPageInHeader(page: CmsPageDocument): boolean {
  return Boolean(page.showInHeader ?? page.showInNav);
}

export function isCmsPageInFooter(page: CmsPageDocument): boolean {
  return Boolean(page.footerGroup && page.footerGroup !== "none");
}
