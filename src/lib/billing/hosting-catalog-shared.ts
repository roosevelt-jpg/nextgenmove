export type HostingFeatureBadge = "NEW" | "FREE" | null;

export interface HostingFeature {
  id: string;
  label: string;
  badge?: HostingFeatureBadge;
  underlined?: boolean;
}

export interface HostingPlan {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  monthlyPrice: number;
  listMonthlyPrice: number;
  savePercent: number;
  renewMonthlyPrice: number;
  resources: string[];
  features: HostingFeature[];
}

export interface HostingPeriod {
  id: string;
  months: number;
  label: string;
}

export interface HostingAddOn {
  id: string;
  label: string;
  listAmount: number;
  amount: number;
}

export interface HostingCatalog {
  currency: string;
  currencySymbol: string;
  partnerName: string;
  taxRatePercent: number;
  defaultPlanId: string;
  defaultPeriodId: string;
  dealPeriodId: string;
  plans: HostingPlan[];
  periods: HostingPeriod[];
  addOns: HostingAddOn[];
}

export interface HostingQuote {
  planId: string;
  periodId: string;
  months: number;
  monthlyPrice: number;
  listMonthlyPrice: number;
  planSubtotal: number;
  planListSubtotal: number;
  addOnsSubtotal: number;
  addOnsListSubtotal: number;
  taxAmount: number;
  total: number;
  listTotal: number;
  savings: number;
  currency: string;
  currencySymbol: string;
}

/** Operational defaults — mirrored into Firestore by seed. */
export const DEFAULT_HOSTING_CATALOG: HostingCatalog = {
  currency: "USD",
  currencySymbol: "$",
  partnerName: "Hostinger",
  taxRatePercent: 21,
  defaultPlanId: "startup",
  defaultPeriodId: "12",
  dealPeriodId: "24",
  plans: [
    {
      id: "startup",
      name: "Agency Startup",
      shortName: "Startup",
      tagline: "Optimized for business and ecommerce websites.",
      monthlyPrice: 25,
      listMonthlyPrice: 69,
      savePercent: 64,
      renewMonthlyPrice: 49,
      resources: [
        "6 CPU cores",
        "12 GB RAM",
        "300 GB NVMe storage",
        "4 000 000 inodes (files and directories)",
        "100 websites",
        "10 mailboxes per website – free for 1 year",
      ],
      features: [
        { id: "isolation", label: "Full website isolation", badge: "NEW" },
        { id: "sharing", label: "Access sharing per site", badge: "NEW" },
        { id: "unbranded", label: "Unbranded client dashboard", badge: "NEW" },
        { id: "monitoring", label: "Proactive monitoring alerts", badge: "NEW" },
        { id: "cdn", label: "Unlimited CDN & SSL", badge: "FREE" },
        { id: "vibe", label: "5 vibe coding credits", badge: "FREE" },
        { id: "support", label: "Priority 24/7 expert support", underlined: true },
        { id: "ip", label: "Dedicated IP address", underlined: true },
        { id: "backups", label: "Daily backups", underlined: true },
        {
          id: "managed",
          label: "Managed hosting for WordPress and WooCommerce",
          underlined: true,
        },
        {
          id: "guarantee",
          label: "30-Day money-back guarantee",
          underlined: true,
        },
      ],
    },
    {
      id: "professional",
      name: "Agency Professional",
      shortName: "Professional",
      tagline: "More resources for growing agency portfolios.",
      monthlyPrice: 40,
      listMonthlyPrice: 99,
      savePercent: 60,
      renewMonthlyPrice: 69,
      resources: [
        "8 CPU cores",
        "16 GB RAM",
        "400 GB NVMe storage",
        "5 000 000 inodes (files and directories)",
        "150 websites",
        "20 mailboxes per website – free for 1 year",
      ],
      features: [
        { id: "isolation", label: "Full website isolation", badge: "NEW" },
        { id: "sharing", label: "Access sharing per site", badge: "NEW" },
        { id: "unbranded", label: "Unbranded client dashboard", badge: "NEW" },
        { id: "monitoring", label: "Proactive monitoring alerts", badge: "NEW" },
        { id: "cdn", label: "Unlimited CDN & SSL", badge: "FREE" },
        { id: "vibe", label: "15 vibe coding credits", badge: "FREE" },
        { id: "support", label: "Priority 24/7 expert support", underlined: true },
        { id: "ip", label: "Dedicated IP address", underlined: true },
        { id: "backups", label: "Daily backups", underlined: true },
        {
          id: "managed",
          label: "Managed hosting for WordPress and WooCommerce",
          underlined: true,
        },
        {
          id: "guarantee",
          label: "30-Day money-back guarantee",
          underlined: true,
        },
      ],
    },
    {
      id: "growth",
      name: "Agency Growth",
      shortName: "Growth",
      tagline: "Maximum capacity for high-traffic client sites.",
      monthlyPrice: 70,
      listMonthlyPrice: 149,
      savePercent: 53,
      renewMonthlyPrice: 99,
      resources: [
        "12 CPU cores",
        "24 GB RAM",
        "500 GB NVMe storage",
        "6 000 000 inodes (files and directories)",
        "250 websites",
        "30 mailboxes per website – free for 1 year",
      ],
      features: [
        { id: "isolation", label: "Full website isolation", badge: "NEW" },
        { id: "sharing", label: "Access sharing per site", badge: "NEW" },
        { id: "unbranded", label: "Unbranded client dashboard", badge: "NEW" },
        { id: "monitoring", label: "Proactive monitoring alerts", badge: "NEW" },
        { id: "cdn", label: "Unlimited CDN & SSL", badge: "FREE" },
        { id: "vibe", label: "30 vibe coding credits", badge: "FREE" },
        { id: "support", label: "Priority 24/7 expert support", underlined: true },
        { id: "ip", label: "Dedicated IP address", underlined: true },
        { id: "backups", label: "Daily backups", underlined: true },
        {
          id: "managed",
          label: "Managed hosting for WordPress and WooCommerce",
          underlined: true,
        },
        {
          id: "guarantee",
          label: "30-Day money-back guarantee",
          underlined: true,
        },
      ],
    },
  ],
  periods: [
    { id: "12", months: 12, label: "12 months" },
    { id: "24", months: 24, label: "24 months" },
  ],
  addOns: [
    { id: "backup", label: "Daily backup", listAmount: 23.88, amount: 0 },
    { id: "domain", label: "Domain", listAmount: 16.99, amount: 0 },
    {
      id: "privacy",
      label: "Domain privacy protection",
      listAmount: 0,
      amount: 0,
    },
  ],
};

export function buildHostingQuote(
  catalog: HostingCatalog,
  planId: string,
  periodId: string,
): HostingQuote | null {
  const plan = catalog.plans.find((item) => item.id === planId);
  const period = catalog.periods.find((item) => item.id === periodId);
  if (!plan || !period) return null;

  const planSubtotal = Number((plan.monthlyPrice * period.months).toFixed(2));
  const planListSubtotal = Number(
    (plan.listMonthlyPrice * period.months).toFixed(2),
  );
  const addOnsSubtotal = Number(
    catalog.addOns.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
  );
  const addOnsListSubtotal = Number(
    catalog.addOns.reduce((sum, item) => sum + item.listAmount, 0).toFixed(2),
  );
  const taxable = planSubtotal + addOnsSubtotal;
  const taxAmount = Number(
    ((taxable * catalog.taxRatePercent) / 100).toFixed(2),
  );
  const total = Number((taxable + taxAmount).toFixed(2));
  const listTotal = Number(
    (planListSubtotal + addOnsListSubtotal + taxAmount).toFixed(2),
  );
  const savings = Number((listTotal - total).toFixed(2));

  return {
    planId: plan.id,
    periodId: period.id,
    months: period.months,
    monthlyPrice: plan.monthlyPrice,
    listMonthlyPrice: plan.listMonthlyPrice,
    planSubtotal,
    planListSubtotal,
    addOnsSubtotal,
    addOnsListSubtotal,
    taxAmount,
    total,
    listTotal,
    savings,
    currency: catalog.currency,
    currencySymbol: catalog.currencySymbol,
  };
}

export function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeHostingCatalog(
  raw: Record<string, unknown>,
): HostingCatalog {
  const base = DEFAULT_HOSTING_CATALOG;
  const plansRaw = Array.isArray(raw.plans) ? raw.plans : base.plans;
  const periodsRaw = Array.isArray(raw.periods) ? raw.periods : base.periods;
  const addOnsRaw = Array.isArray(raw.addOns) ? raw.addOns : base.addOns;

  return {
    currency: String(raw.currency ?? base.currency),
    currencySymbol: String(raw.currencySymbol ?? base.currencySymbol),
    partnerName: String(raw.partnerName ?? base.partnerName),
    taxRatePercent: asNumber(raw.taxRatePercent, base.taxRatePercent),
    defaultPlanId: String(raw.defaultPlanId ?? base.defaultPlanId),
    defaultPeriodId: String(raw.defaultPeriodId ?? base.defaultPeriodId),
    dealPeriodId: String(raw.dealPeriodId ?? base.dealPeriodId),
    plans: plansRaw.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const fallback = base.plans[index] ?? base.plans[0]!;
      return {
        id: String(row.id ?? fallback.id),
        name: String(row.name ?? fallback.name),
        shortName: String(row.shortName ?? fallback.shortName),
        tagline: String(row.tagline ?? fallback.tagline),
        monthlyPrice: asNumber(row.monthlyPrice, fallback.monthlyPrice),
        listMonthlyPrice: asNumber(
          row.listMonthlyPrice,
          fallback.listMonthlyPrice,
        ),
        savePercent: asNumber(row.savePercent, fallback.savePercent),
        renewMonthlyPrice: asNumber(
          row.renewMonthlyPrice,
          fallback.renewMonthlyPrice,
        ),
        resources: Array.isArray(row.resources)
          ? row.resources.map((value) => String(value))
          : fallback.resources,
        features: Array.isArray(row.features)
          ? row.features.map((feature, featureIndex) => {
              const f = (feature ?? {}) as Record<string, unknown>;
              const fb = fallback.features[featureIndex];
              const badgeRaw =
                f.badge == null ? fb?.badge ?? null : String(f.badge);
              const badge =
                badgeRaw === "NEW" || badgeRaw === "FREE" ? badgeRaw : null;
              return {
                id: String(f.id ?? fb?.id ?? `feature_${featureIndex}`),
                label: String(f.label ?? fb?.label ?? ""),
                badge,
                underlined: Boolean(f.underlined ?? fb?.underlined),
              };
            })
          : fallback.features,
      };
    }),
    periods: periodsRaw.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const fallback = base.periods[index] ?? base.periods[0]!;
      return {
        id: String(row.id ?? fallback.id),
        months: asNumber(row.months, fallback.months),
        label: String(row.label ?? fallback.label),
      };
    }),
    addOns: addOnsRaw.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const fallback = base.addOns[index] ?? base.addOns[0]!;
      return {
        id: String(row.id ?? fallback.id),
        label: String(row.label ?? fallback.label),
        listAmount: asNumber(row.listAmount, fallback.listAmount),
        amount: asNumber(row.amount, fallback.amount),
      };
    }),
  };
}
