export interface StatBlock {
  label: string;
  /** Manual display value, or fallback when metric is unavailable */
  value: string;
  /**
   * When set, homepage replaces `value` with a live Firestore metric.
   * Use `manual` (or omit) to keep the CMS value as-is.
   */
  metric?:
    | "active_students"
    | "active_companies"
    | "placed_this_quarter"
    | "placed_this_year"
    | "avg_time_to_place"
    | "origin_cities"
    | "manual";
  /** Optional suffix appended to live metrics (e.g. "+", "%") */
  suffix?: string;
}

export interface StepItem {
  legNumber: number;
  phaseLabel?: string;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface OriginCity {
  code: string;
  label: string;
  /** Optional avatar initials shown on the homepage globe */
  initials?: string;
  x: number;
  y: number;
  /** Optional avatar bubble position (defaults from city x/y) */
  avatarX?: number;
  avatarY?: number;
}

export interface BoardingPassFields {
  routeLabel?: string;
  passengerLabel?: string;
  passengerValue?: string;
  coachLabel?: string;
  coachValue?: string;
  statusLabel?: string;
  statusValue?: string;
  classLabel?: string;
  classValue?: string;
  refLabel?: string;
  refValue?: string;
}

export interface AudienceCtaBand {
  eyebrow?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface RoutesMarqueeSettings {
  /** Seconds for one full loop (lower = faster). Default 28. */
  speedSec?: number;
  /** ltr = left → right (default), rtl = right → left */
  direction?: "ltr" | "rtl";
  /** CSS timing function */
  easing?: "linear" | "ease" | "ease-in-out";
  pauseOnHover?: boolean;
  /** Separator between items, e.g. " · " */
  separator?: string;
  /** When false, bar renders static (no animation). Default true. */
  enabled?: boolean;
}

export interface RouteMarqueeItem {
  code?: string;
  label?: string;
}

export interface PageHomeDocument {
  eyebrowText?: string;
  headline?: string;
  headlineEmphasis?: string;
  subtext?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
  hubLabel?: string;
  originCities?: OriginCity[];
  currentRoutesLabel?: string;
  /** Editable marquee entries — admin can add/remove any number */
  currentRoutesItems?: RouteMarqueeItem[];
  routesMarquee?: RoutesMarqueeSettings;
  boardingPass?: BoardingPassFields;
  globalReachEyebrow?: string;
  globalReachHeadline?: string;
  globalReachBody?: string;
  corridorChips?: Array<string | { chip?: string }>;
  itineraryEyebrow?: string;
  itineraryHeadline?: string;
  storiesEyebrow?: string;
  storiesHeadline?: string;
  storiesManagedLabel?: string;
  podcastEyebrow?: string;
  podcastHeadline?: string;
  podcastManagedLabel?: string;
  testimonialQuote?: string;
  testimonialAttribution?: string;
  testimonialBadge?: string;
  talentCta?: AudienceCtaBand;
  companyCta?: AudienceCtaBand;
  /** Third homepage audience CTA (e.g. open roles) */
  rolesCta?: AudienceCtaBand;
  statBlocks?: StatBlock[];
  steps?: StepItem[];
}

export interface VideoCardDocument {
  id: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  duration: string;
  thumbnailUrl: string;
  position: number;
  status: "draft" | "live" | "archived";
}

export interface PodcastEpisodeDocument {
  id: string;
  episodeNumber: number;
  title: string;
  guestName: string;
  duration: string;
  audioUrl: string;
  description: string;
  status: "draft" | "live" | "archived";
}

export interface PageAboutDocument {
  heroHeadline?: string;
  heroSubtext?: string;
  missionBody?: string;
  statBlocks?: StatBlock[];
  teamMembers?: TeamMember[];
  foundingStory?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  photo: string;
  bio: string;
}

export interface PageHowItWorksDocument {
  steps?: StepItem[];
  faqItems?: FaqItem[];
}

export interface PagePricingDocument {
  trackAHeadline?: string;
  trackAFeatures?: string[];
  trackBHeadline?: string;
  trackBFeatures?: string[];
  faqItems?: FaqItem[];
  ctaLabel?: string;
}

export interface ComparisonRow {
  feature: string;
  trackAValue: string;
  trackBValue: string;
}

export interface CaseStudyQuote {
  quote: string;
  companyName: string;
  resultStat: string;
}

export interface PageTracksDocument {
  trackABody?: string;
  trackBBody?: string;
  comparisonRows?: ComparisonRow[];
  caseStudyQuote?: CaseStudyQuote | null;
  /** Optional metrics strip — supports live `metric` keys like homepage stats */
  statBlocks?: StatBlock[];
  ctaLabel?: string;
  ctaHref?: string;
}

export interface NavLabels {
  siteName?: string;
  companySection?: string;
  talentSection?: string;
  employersSection?: string;
  about?: string;
  careers?: string;
  journal?: string;
  browseRoles?: string;
  howItWorks?: string;
  credits?: string;
  pricing?: string;
  tracks?: string;
  requestTalent?: string;
  [key: string]: string | undefined;
}

export interface FooterLink {
  key: string;
  href: string;
  label?: string;
}

export interface FooterGroup {
  key: string;
  label?: string;
  links: FooterLink[];
}

export interface SocialLink {
  key: string;
  label?: string;
  url: string;
}

export type CmsPageFooterGroup = "company" | "talent" | "employers" | "none";

export interface CmsPageDocument {
  id: string;
  slug: string;
  title: string;
  eyebrow?: string;
  headline?: string;
  body?: string;
  status: "draft" | "published";
  /** @deprecated Prefer showInHeader */
  showInNav?: boolean;
  showInHeader?: boolean;
  /** Footer column to list this page under; "none" hides from footer */
  footerGroup?: CmsPageFooterGroup;
  navLabel?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CmsFormField {
  key: string;
  label: string;
  type: "text" | "email" | "textarea" | "select";
  required?: boolean;
  options?: string;
  placeholder?: string;
}

export interface CmsFormDocument {
  id: string;
  slug: string;
  title: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  fields?: CmsFormField[];
  status: "draft" | "published";
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SiteSettingsDocument {
  siteName?: string;
  tagline?: string;
  /** Site-wide description used for default SEO / meta description */
  siteDescription?: string;
  logoUrl?: string;
  faviconUrl?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  contactEmail?: string;
  /** Brand mark when logo image is empty — e.g. "NG" */
  brandMark?: string;
  timezone?: string;
  defaultCurrency?: string;
  require2fa?: boolean;
  sessionExpireDays?: number;
  operatorPlanLabel?: string;
  operatorPlanDetail?: string;
  billingManageUrl?: string;
  socialLinks?: SocialLink[];
  /** Footer bottom bar — e.g. "© {year} {siteName}" */
  footerCopyright?: string;
  /** Text before the attribution link — e.g. "Made with ❤️ by" */
  footerAttributionPrefix?: string;
  /** Linked attribution name — e.g. "FLYN.AI" */
  footerAttributionName?: string;
  /** Attribution href — e.g. https://myflynai.com/ */
  footerAttributionUrl?: string;
  navLabels?: NavLabels;
  footerLinks?: FooterGroup[];
  formLabels?: Record<string, string>;
  pageLabels?: Record<string, string>;
  authLabels?: Record<string, string>;
  employerNavLabels?: Record<string, string>;
  employerPageLabels?: Record<string, Record<string, string>>;
  employerNotificationKeys?: string[];
  studentNavLabels?: Record<string, string>;
  studentPageLabels?: Record<string, Record<string, string>>;
  studentNotificationKeys?: string[];
  adminNavLabels?: Record<string, string>;
  adminPageLabels?: Record<string, Record<string, string>>;
  adminNotificationKeys?: string[];
  localeLabels?: Record<string, string>;
}

export interface TaxonomyOption {
  value: string;
  label: string;
}

export interface TaxonomiesDocument {
  sector?: TaxonomyOption[];
  department?: TaxonomyOption[];
  employmentType?: TaxonomyOption[];
  seniority?: TaxonomyOption[];
  timeline?: TaxonomyOption[];
  category?: TaxonomyOption[];
  preferredTrack?: TaxonomyOption[];
  articleTag?: TaxonomyOption[];
  nationality?: TaxonomyOption[];
}

export interface JobPostingDocument {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  status: "open" | "closed";
  createdAt: string | null;
}

export interface ArticleDocument {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
  publishedDate: string | null;
  tags: string[];
  status: "draft" | "published";
  createdAt: string | null;
}

export interface PublicRoleDocument {
  id: string;
  title: string;
  employerLabel: string;
  sector: string;
  location: string;
  seniority: string;
  relocationSupport: boolean;
  description: string;
  status: "open" | "filled";
  createdAt: string | null;
}

export interface ContentItemDocument {
  id: string;
  title: string;
  type: "video" | "pdf" | "course" | "download" | "coaching" | "webinar" | "premium";
  description: string;
  thumbnailUrl: string;
  fileUrl: string;
  costCredits: number;
  priceEur?: number;
  emojiIcon?: string;
  linkUrl?: string;
  category: string;
  status: "draft" | "live" | "archived";
  createdAt: string | null;
}

export interface WayToEarn {
  id: string;
  action: string;
  credits: number;
  description: string;
}

export interface CreditTopUpPackage {
  id: string;
  label: string;
  credits: number;
  priceEur: number;
}

export interface ProgramLeversDocument {
  trackAMonthly: number;
  trackAMatchFee: number;
  trackBMonthly: number;
  placementFeeEur: number;
  creditsPerEuro: number;
  creditTopUpPackages: CreditTopUpPackage[];
  waysToEarn: WayToEarn[];
  updatedAt: string | null;
}
